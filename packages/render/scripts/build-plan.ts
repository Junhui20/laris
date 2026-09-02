/**
 * Compile a Business Profile into a Shot Plan.
 *
 * The Profile is the input, and it is read — not retyped. Every number that
 * reaches the screen comes from `readFacts`, which pulls it out of schema
 * fields or out of the offering's own prose and **throws** when the Profile
 * stops saying it. Editorial phrasing is authored here; factual claims are not,
 * because an edit to the Profile that quietly left a stale marketing asset
 * behind is exactly the failure this package exists to avoid.
 *
 * Everything that measures a file or looks at a photograph also happens here,
 * once, and lands in JSON. The compositions only draw.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import jpeg from "jpeg-js";
// Until #3 lands, the committed fixture is the Business Profile. When the
// repository can read one, this import becomes a lookup by slug and nothing
// below it changes.
import { pangkorMyHomestay } from "../../api/src/fixtures/pangkor-my-homestay.js";
import { type Facts, readFacts } from "../src/profile-facts.js";

// Set by `scripts/run-ts.mjs`: this file is bundled into a temp directory
// before it runs, so it cannot locate the package from its own path.
const pkg = process.env.LARIS_RENDER_ROOT ?? process.cwd();
const SLUG = "pangkor-my-homestay";
const PHOTOS_SRC = join(pkg, "../api/public/m", SLUG);
const PHOTOS_OUT = join(pkg, "public/photos");
const VO = join(pkg, "public/vo");
const MUSIC = join(pkg, "public/music/bed.mp3");

/**
 * Silence after each line, so the cut lands in a gap rather than mid-sentence.
 * Without it the narration runs continuously across every cut and the voice
 * stops sounding like it belongs to the picture.
 */
const TAIL_MS = 300;
/** Only a true 3:4 survives a 9:16 crop. 1040x1080 does not — it becomes felt. */
const PORTRAIT_MAX = 0.8;

type Motion = "pan-x" | "pan-y" | "punch";
type FrameSpec = [stem: string, motion: Motion, reverse?: boolean];
type SceneSpec = {
  line: number;
  spoken: string;
  headline: (f: Facts) => string;
  sub?: (f: Facts) => string;
  tag?: string;
  frames: FrameSpec[];
};

/**
 * The narration, and what the screen says over it.
 *
 * `spoken` is a sentence; the headline is three or four words. They are not the
 * same text on purpose — a caption that transcribes the voice gives a viewer
 * two copies of one thing and no reason to look at either.
 *
 * Nothing here narrates a kitchen, a barbecue or the beach: no photograph in
 * this set shows any of them, and a test asserts it stays that way.
 */
const SCENES: SceneSpec[] = [
  {
    line: 0,
    spoken: "一团人出游，最怕分开住。",
    headline: () => "最怕分开住",
    frames: [["frontage-sky", "punch"]],
  },
  {
    line: 1,
    spoken: "这里整栋租给你，十五个人。",
    headline: () => "整栋租给你",
    sub: (f) => `${f.capacityLow}–${f.capacityPax} 人 · 加床到 ${f.maxPax}`,
    frames: [
      ["frontage", "pan-x"],
      ["room-twin", "pan-x", true],
    ],
  },
  {
    line: 2,
    spoken: "四间房，每间房里都有厕所。",
    headline: (f) => `${f.bedrooms} 间房，${f.bedrooms} 个厕所`,
    sub: () => "早上不用排队",
    // The first of these two is the shot with the ensuite door open in it.
    frames: [
      ["room-ensuite", "pan-y"],
      ["room-balcony", "pan-x", true],
    ],
  },
  {
    line: 3,
    spoken: "楼上楼下两个客厅，吵的和睡的分得开。",
    headline: () => "楼上楼下两个客厅",
    sub: (f) => `全屋冷气 · ${f.aircon} 架冷气 ${f.fans} 架风扇`,
    // One cut, because there is exactly one photograph of a living room. The
    // second frame here used to be a bedroom, which is the same fault as
    // narrating the beach over the car porch — just less obvious.
    frames: [["living-room", "pan-x"]],
  },
  {
    line: 4,
    spoken: "小格楼上面，还有三个床位。",
    headline: (f) => `小格楼再加 ${f.loftBeds} 个床位`,
    frames: [
      ["loft-stairs", "pan-y"],
      ["loft-beds", "pan-x"],
    ],
  },
  {
    line: 5,
    spoken: "麻将、K歌、脚踏车，全部不另外收钱。",
    headline: () => "麻将 · K 歌 · 脚踏车",
    sub: () => "全部不另外收钱",
    frames: [["mahjong", "punch"]],
  },
  {
    line: 7,
    // Re-recorded twice. The first version claimed the beach over a photograph
    // of the car porch; the second still ended on 就到海滩, and the test meant
    // to catch it joined every line into one string and anchored on the end, so
    // only the last scene could ever fail. This one claims the bicycles, which
    // are in the frame. The walk to the beach survives as caption text: a
    // caption is a claim the viewer reads, not one the picture pretends to make.
    spoken: "脚踏车免费借，想去哪里自己骑。",
    headline: (f) => `海滩走路 ${f.beachWalkMin} 分钟`,
    sub: (f) => `脚踏车免费借 · 7-Eleven ${f.storeWalkMin} 分钟`,
    frames: [["frontage", "pan-x", true]],
  },
  {
    line: 8,
    spoken: "日期先问，价钱 WhatsApp 报给你。",
    headline: () => "邦咯岛渡假屋 No.23",
    sub: (f) => `WhatsApp ${f.whatsapp}`,
    tag: "问日期 · 问价钱",
    frames: [["frontage-sky", "punch"]],
  },
];

const hex = (rgb: number[]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function hslToRgb(h: number, s: number, l: number): number[] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function rgbToHsl(red: number, green: number, blue: number): number[] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
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
function sceneColour(pixels: Uint8Array, width: number, height: number): string {
  const buckets = new Map<number, number[]>();
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      const key =
        (((pixels[i] as number) >> 4) << 8) |
        (((pixels[i + 1] as number) >> 4) << 4) |
        ((pixels[i + 2] as number) >> 4);
      const cell = buckets.get(key) ?? [0, 0, 0, 0];
      cell[0] = (cell[0] as number) + (pixels[i] as number);
      cell[1] = (cell[1] as number) + (pixels[i + 1] as number);
      cell[2] = (cell[2] as number) + (pixels[i + 2] as number);
      cell[3] = (cell[3] as number) + 1;
      buckets.set(key, cell);
    }
  }

  const sampled = [...buckets.values()].reduce((t, c) => t + (c[3] as number), 0);
  const floor = sampled * 0.02;

  let best = [40, 60, 74];
  let score = -1;
  for (const cell of buckets.values()) {
    const n = cell[3] as number;
    if (n < floor) continue;
    const rgb = [(cell[0] as number) / n, (cell[1] as number) / n, (cell[2] as number) / n];
    const [, s, l] = rgbToHsl(rgb[0] as number, rgb[1] as number, rgb[2] as number);
    if ((l as number) < 0.08 || (l as number) > 0.92) continue;
    const weight = (s as number) * Math.sqrt(n);
    if (weight > score) {
      best = rgb;
      score = weight;
    }
  }

  const [h, s] = rgbToHsl(best[0] as number, best[1] as number, best[2] as number);
  return hex(hslToRgb(h as number, Math.max(0.34, Math.min((s as number) * 1.5, 0.62)), 0.155));
}

const durationMs = (file: string) =>
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

const facts = readFacts(pangkorMyHomestay, SLUG);

mkdirSync(PHOTOS_OUT, { recursive: true });
const files = readdirSync(PHOTOS_SRC).filter((f) => f.endsWith(".jpg"));
for (const f of files) copyFileSync(join(PHOTOS_SRC, f), join(PHOTOS_OUT, f));

const byStem = new Map(files.map((f) => [f.replace(/-\d+\.jpg$/, ""), f]));
const photo = (stem: string) => {
  const file = byStem.get(stem);
  if (!file) throw new Error(`no photograph for "${stem}" in ${PHOTOS_SRC}`);
  return file;
};

const plan = {
  merchantSlug: facts.slug,
  contact: `WhatsApp ${facts.whatsapp}`,
  card: {
    headline: `${facts.capacityPax} 个人，住一整栋`,
    sub:
      `邦咯岛 · ${facts.bedrooms} 间房，每间自带卫浴 · 加床到 ${facts.maxPax} 人\n` +
      `WhatsApp ${facts.whatsapp}`,
  },
  ...(existsSync(MUSIC) ? { music: "music/bed.mp3" } : {}),
  scenes: SCENES.map((scene) => {
    const first = photo(scene.frames[0]?.[0] as string);
    const raw = jpeg.decode(readFileSync(join(PHOTOS_OUT, first)), { useTArray: true });
    const speech = durationMs(join(VO, `line-${scene.line}.mp3`));
    return {
      audio: `vo/line-${scene.line}.mp3`,
      speechMs: speech,
      durationMs: speech + TAIL_MS,
      spoken: scene.spoken,
      headline: scene.headline(facts),
      ...(scene.sub ? { sub: scene.sub(facts) } : {}),
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
console.log(
  `${plan.scenes.length} scenes, ${cuts} cuts, ${(total / 1000).toFixed(1)}s` +
    `${plan.music ? " + music bed" : " (no music bed — drop a licensed track at public/music/bed.mp3)"}`,
);
for (const s of plan.scenes) {
  console.log(
    `  ${String(s.durationMs).padStart(5)}ms  ${s.color}  ${s.frames.length}×  ${s.headline}`,
  );
}
