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

const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync) ?? null;
const options = { browserExecutable: chrome, chromiumOptions: { gl: "angle" } };

console.log("bundling…");
const serveUrl = await bundle({ entryPoint: join(pkg, "src/index.ts") });

for (const [id, file] of [
  ["ListingReel", "listing-reel.mp4"],
  ["ListingWide", "listing-wide.mp4"],
  ["ListingCard", "listing-card.jpeg"],
]) {
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
