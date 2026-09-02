/**
 * Compile a Business Profile into a Shot Plan.
 *
 * Everything that looks at a photograph, measures an audio file or makes an
 * editorial choice happens here, once, and lands in JSON. The compositions only
 * draw. That is the same boundary phase 01 and phase 02 have to hold, and it
 * makes the decisions reviewable as a diff instead of as thirty seconds of
 * video.
 *
 * Also copies the Merchant's photographs into `public/`. They have one home,
 * `packages/api/public/m/<slug>/`, and it is not here.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jpeg from "jpeg-js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const SLUG = "pangkor-my-homestay";
const PHOTOS_SRC = join(pkg, "../api/public/m", SLUG);
const PHOTOS_OUT = join(pkg, "public/photos");
const VO = join(pkg, "public/vo");

const CONTACT = "WhatsApp 012-535 8226";

/**
 * The narration, and what the screen says over it.
 *
 * `spoken` is a sentence; `headline` is three or four words. They are not the
 * same text on purpose — a caption that transcribes the voice gives a viewer
 * two copies of one thing and no reason to look at either.
 *
 * Every claim is a fact from `pangkor-my-homestay.ts`. The one line we recorded
 * and did not use is the kitchen and barbecue: there is no photograph of either,
 * and saying it over a bedroom is how "walk 13 minutes to the beach" ended up
 * over a picture of the car porch in the first cut.
 */
const SCENES = [
  {
    line: 0,
    spoken: "一团人出游，最怕分开住。",
    headline: "最怕分开住",
    frames: [["frontage-sky", "punch"]],
  },
  {
    line: 1,
    spoken: "这里整栋租给你，十五个人。",
    headline: "整栋租给你",
    sub: "12–15 人 · 加床到 20",
    frames: [
      ["frontage", "pan-x"],
      ["room-twin", "pan-x", true],
    ],
  },
  {
    line: 2,
    spoken: "四间房，每间房里都有厕所。",
    headline: "4 间房，4 个厕所",
    sub: "早上不用排队",
    // The first of these two is the shot with the ensuite door open in it.
    frames: [
      ["room-ensuite", "pan-y"],
      ["room-balcony", "pan-x", true],
    ],
  },
  {
    line: 3,
    spoken: "楼上楼下两个客厅，吵的和睡的分得开。",
    headline: "楼上楼下两个客厅",
    sub: "全屋冷气 · 7 架冷气 7 架风扇",
    // One cut, because there is exactly one photograph of a living room. The
    // second frame here used to be a bedroom, which is the same fault as
    // narrating the beach over the car porch — just less obvious.
    frames: [["living-room", "pan-x"]],
  },
  {
    line: 4,
    spoken: "小格楼上面，还有三个床位。",
    headline: "小格楼再加 3 个床位",
    frames: [
      ["loft-stairs", "pan-y"],
      ["loft-beds", "pan-x"],
    ],
  },
  {
    line: 5,
    spoken: "麻将、K歌、脚踏车，全部不另外收钱。",
    headline: "麻将 · K 歌 · 脚踏车",
    sub: "全部不另外收钱",
    frames: [["mahjong", "punch"]],
  },
  {
    line: 7,
    spoken: "脚踏车免费借，走路十三分钟就到海滩。",
    headline: "海滩走路 13 分钟",
    sub: "脚踏车免费借 · 7-Eleven 2 分钟",
    // Re-recorded. The line used to claim the beach over a photograph of the
    // car porch. This one claims the bicycles, and the bicycles are in the
    // frame — the walk to the beach stays as text, which is a caption rather
    // than a thing the picture is pretending to show.
    frames: [["frontage", "pan-x", true]],
  },
  {
    line: 8,
    spoken: "日期先问，价钱 WhatsApp 报给你。",
    headline: "邦咯岛渡假屋 No.23",
    sub: CONTACT,
    tag: "问日期 · 问价钱",
    frames: [["frontage-sky", "punch"]],
  },
];

/**
 * Silence after each line, so the cut lands in a gap rather than mid-sentence.
 * Without it the narration runs continuously across every cut and the voice
 * stops sounding like it belongs to the picture.
 */
const TAIL_MS = 300;

const hex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function hslToRgb(h, s, l) {
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

/**
 * The scene colour: the most saturated colour the photograph actually contains,
 * weighted by how much of the frame it covers, then taken down to a tone white
 * type sits on. The wall paint is what reads as "this house"; the floor tile is
 * what an average returns, and the yellow front door — one percent of two
 * frames — is what saturation alone picks.
 */
function sceneColour(pixels, width, height) {
  const buckets = new Map();
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      const key = ((pixels[i] >> 4) << 8) | ((pixels[i + 1] >> 4) << 4) | (pixels[i + 2] >> 4);
      const cell = buckets.get(key) ?? [0, 0, 0, 0];
      cell[0] += pixels[i];
      cell[1] += pixels[i + 1];
      cell[2] += pixels[i + 2];
      cell[3] += 1;
      buckets.set(key, cell);
    }
  }

  const sampled = [...buckets.values()].reduce((t, c) => t + c[3], 0);
  const floor = sampled * 0.02;

  let best = [40, 60, 74];
  let score = -1;
  for (const [r, g, b, n] of buckets.values()) {
    if (n < floor) continue;
    const rgb = [r / n, g / n, b / n];
    const [, s, l] = rgbToHsl(...rgb);
    if (l < 0.08 || l > 0.92) continue;
    const weight = s * Math.sqrt(n);
    if (weight > score) {
      best = rgb;
      score = weight;
    }
  }

  const [h, s] = rgbToHsl(...best);
  return hex(hslToRgb(h, Math.max(0.34, Math.min(s * 1.5, 0.62)), 0.155));
}

const durationMs = (file) =>
  Math.round(
    Number.parseFloat(
      execFileSync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        file,
      ]).toString(),
    ) * 1000,
  );

mkdirSync(PHOTOS_OUT, { recursive: true });
const files = readdirSync(PHOTOS_SRC).filter((f) => f.endsWith(".jpg"));
for (const f of files) copyFileSync(join(PHOTOS_SRC, f), join(PHOTOS_OUT, f));

const byStem = new Map(files.map((f) => [f.replace(/-\d+\.jpg$/, ""), f]));
const photo = (stem) => {
  const file = byStem.get(stem);
  if (!file) throw new Error(`no photograph for "${stem}" in ${PHOTOS_SRC}`);
  return file;
};

const plan = {
  merchantSlug: SLUG,
  contact: CONTACT,
  scenes: SCENES.map((scene) => {
    const audio = `vo/line-${scene.line}.mp3`;
    const first = photo(scene.frames[0][0]);
    const raw = jpeg.decode(readFileSync(join(PHOTOS_OUT, first)), { useTArray: true });
    return {
      audio,
      durationMs: durationMs(join(VO, `line-${scene.line}.mp3`)) + TAIL_MS,
      spoken: scene.spoken,
      headline: scene.headline,
      ...(scene.sub ? { sub: scene.sub } : {}),
      ...(scene.tag ? { tag: scene.tag } : {}),
      frames: scene.frames.map(([stem, motion, reverse]) => ({
        photo: photo(stem),
        motion,
        reverse: Boolean(reverse),
      })),
      color: sceneColour(raw.data, raw.width, raw.height),
    };
  }),
};

writeFileSync(join(pkg, "src/shot-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
const total = plan.scenes.reduce((n, s) => n + s.durationMs, 0);
const cuts = plan.scenes.reduce((n, s) => n + s.frames.length, 0);
console.log(`${plan.scenes.length} scenes, ${cuts} cuts, ${(total / 1000).toFixed(1)}s`);
for (const s of plan.scenes) {
  console.log(
    `  ${String(s.durationMs).padStart(5)}ms  ${s.color}  ${s.frames.length}×  ${s.headline}`,
  );
}
