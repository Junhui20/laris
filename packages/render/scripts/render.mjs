import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
/**
 * Render the reel and the cover.
 *
 * Uses the system Chrome rather than downloading Remotion's own Headless Shell:
 * this repo already needs a browser nowhere else, and a 120 MB download that
 * every contributor repeats is a worse default than one flag.
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const out = join(pkg, "out");
mkdirSync(out, { recursive: true });

if (!existsSync(join(pkg, "public/photos"))) {
  throw new Error("no photographs — run `node scripts/build-plan.mjs` first");
}

/** Far enough into the card composition that every line has landed. */
const STILL_FRAME = 45;

/**
 * A Chrome this machine already has, if it has one.
 *
 * Remotion otherwise downloads its own Headless Shell — 113 MB, once per
 * checkout. That is a fine fallback and a bad surprise, so it is reported
 * rather than left to be discovered mid-render. Set `CHROME_PATH` to override.
 */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find(existsSync) ?? null;
console.log(
  chrome
    ? `browser: ${chrome}`
    : "browser: none found — Remotion will download its own Headless Shell (~113 MB, once). " +
        "Set CHROME_PATH to use an installed Chrome.",
);
const gl = process.env.REMOTION_GL ?? "angle";
const options = { browserExecutable: chrome, chromiumOptions: { gl } };

console.log("bundling…");
const serveUrl = await bundle({ entryPoint: join(pkg, "src/index.ts") });

/** `node scripts/render.mjs ListingReel` renders one composition. */
const only = process.argv[2];

/**
 * Debug knobs. `REMOTION_FRAMES=120-200 REMOTION_CONCURRENCY=1` renders a slice
 * on a single tab, which is how you tell a rendering artefact apart from an
 * animation bug: anything that repeats with the period of the tab count is the
 * renderer, not the composition.
 */
const concurrency = process.env.REMOTION_CONCURRENCY
  ? Number(process.env.REMOTION_CONCURRENCY)
  : null;
const frameRange = process.env.REMOTION_FRAMES
  ? process.env.REMOTION_FRAMES.split("-").map(Number)
  : null;

for (const [id, file] of [
  ["ListingReel", "listing-reel.mp4"],
  ["ListingWide", "listing-wide.mp4"],
  ["ListingCard", "listing-card.jpeg"],
]) {
  if (only && id !== only) continue;
  const composition = await selectComposition({ serveUrl, id, ...options });
  const target = join(out, file);
  console.log(
    `${id} → ${file}  ${composition.width}x${composition.height} ${composition.durationInFrames}f`,
  );

  if (file.endsWith(".mp4")) {
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      crf: 22,
      audioCodec: "aac",
      ...(concurrency ? { concurrency } : {}),
      ...(frameRange ? { frameRange } : {}),
      outputLocation: target,
      ...options,
      onProgress: ({ progress }) => process.stdout.write(`\r  ${Math.round(progress * 100)}%   `),
    });
    process.stdout.write("\n");
  } else {
    await renderStill({
      composition,
      serveUrl,
      output: target,
      imageFormat: "jpeg",
      jpegQuality: 92,
      // A still has no time. On frame 0 the caption entrance has not started,
      // so the cover renders as a photograph and a footer and nothing else —
      // which is exactly what it did the first time.
      frame: STILL_FRAME,
      ...options,
    });
  }
}
console.log("done");
