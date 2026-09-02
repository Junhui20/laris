/**
 * Compile a Business Profile into a Shot Plan.
 *
 * Everything that needs to look at a photograph or make an editorial choice
 * happens here, once, and lands in JSON. The compositions only draw. That split
 * is not tidiness — it is the same boundary phase 01 and phase 02 have to hold,
 * and it makes the decisions reviewable as a diff instead of as twenty seconds
 * of video.
 *
 * Also copies the Merchant's photographs into `public/`. They have one home,
 * `packages/api/public/m/<slug>/`, and it is not here.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jpeg from "jpeg-js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const SLUG = "pangkor-my-homestay";
const PHOTOS_SRC = join(pkg, "../api/public/m", SLUG);
const PHOTOS_OUT = join(pkg, "public/photos");

const SHOT_MS = 2300;
const CTA_MS = 3200;
/** Only a true 3:4 survives a 9:16 crop. 1040x1080 does not — it becomes felt. */
const PORTRAIT_MAX = 0.8;

/**
 * The shot list. Every line is a fact from `pangkor-my-homestay.ts`; the
 * eyebrow says which part of the listing it belongs to.
 *
 * hook.type is `number`: the strongest fact she has is that it is a whole house
 * for fifteen, and it is the one thing a hotel cannot answer.
 */
const SHOTS = [
  ["frontage-sky", "整栋", "15 个人，一整栋", "邦咯岛 · 4 间房 · 加床到 20 人"],
  ["living-room", "客厅", "楼上楼下两个客厅", "全屋冷气 · 7 架冷气 7 架风扇"],
  ["room-balcony", "房间", "4 间房，间间有窗", "每间房内自带卫浴"],
  ["room-twin", "房间", "四人房 · 两张床并排", "一家人不用分开住"],
  ["room-ensuite", "房间", "厕所在房里", "早上不用排队"],
  ["loft-stairs", "房间", "木楼梯上去", "小格楼还有 3 个床位"],
  ["mahjong", "设施", "麻将 · K 歌 · 脚踏车", "全部免费用"],
  ["frontage", "位置", "走路 13 分钟到海滩", "7-Eleven 2 分钟 · 码头开车 5 分钟"],
];
const CTA = [
  "frontage-sky",
  "联络",
  "邦咯岛渡假屋 No.23",
  "WhatsApp 012-535 8226",
  "问价 · 看日期",
];
const FOOTER = "邦咯岛渡假屋 No.23 · Pulau Pangkor · 012-535 8226";

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
 * The panel colour: the most saturated colour the photograph actually contains,
 * weighted by how much of the frame it covers, then taken down to a tone white
 * type sits on. The wall paint is what reads as "this house"; the floor tile is
 * what an average returns.
 */
function panelColour(pixels, width, height) {
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

  // A yellow front door is the most saturated thing in two of these frames and
  // covers about one percent of them. Saturation alone picks it and the panel
  // comes out olive under a blue sky, so a colour has to hold a real share of
  // the frame before it can speak for it.
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

mkdirSync(PHOTOS_OUT, { recursive: true });
const files = readdirSync(PHOTOS_SRC).filter((f) => f.endsWith(".jpg"));
for (const f of files) copyFileSync(join(PHOTOS_SRC, f), join(PHOTOS_OUT, f));

const byStem = new Map(files.map((f) => [f.replace(/-\d+\.jpg$/, ""), f]));

function compile([stem, eyebrow, headline, sub, tag], durationMs) {
  const file = byStem.get(stem);
  if (!file) throw new Error(`no photograph for "${stem}" in ${PHOTOS_SRC}`);
  const raw = jpeg.decode(readFileSync(join(PHOTOS_OUT, file)), { useTArray: true });
  return {
    photo: file,
    eyebrow,
    headline,
    sub,
    ...(tag ? { tag } : {}),
    durationMs,
    layout: raw.width / raw.height <= PORTRAIT_MAX ? "full-bleed" : "panel",
    panelColor: panelColour(raw.data, raw.width, raw.height),
  };
}

const plan = {
  merchantSlug: SLUG,
  footer: FOOTER,
  shots: [...SHOTS.map((s) => compile(s, SHOT_MS)), compile(CTA, CTA_MS)],
};

writeFileSync(join(pkg, "src/shot-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
console.log(`${files.length} photographs, ${plan.shots.length} shots`);
for (const s of plan.shots) console.log(`  ${s.layout.padEnd(10)} ${s.panelColor}  ${s.photo}`);
