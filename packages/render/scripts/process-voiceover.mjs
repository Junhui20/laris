/**
 * Turn the raw narration takes into the files the plan reads.
 *
 * The raw takes in `public/vo/raw/` are the source: they came from the TTS API
 * and re-fetching them costs credits. Everything after that is deterministic
 * and lives here, so changing how the voice sounds is a constant in this file
 * rather than eight more generations.
 *
 *   - trim leading and trailing silence, so the tail between lines is the one
 *     the edit adds and not one the model happened to leave
 *   - speed up, pitch preserved. MiniMax reads unhurried; a listing reel is not
 *   - normalise to −16 LUFS, so no line is louder than another
 *
 *   pnpm --filter @laris/render voice
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const RAW = join(pkg, "public/vo/raw");
const OUT = join(pkg, "public/vo");

/** 1.0 keeps the take as recorded. Raise to speed the delivery up. */
const SPEED = 1.2;
const TRIM =
  "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:detection=peak," +
  "areverse," +
  "silenceremove=start_periods=1:start_silence=0.10:start_threshold=-45dB:detection=peak," +
  "areverse";

if (!existsSync(RAW)) throw new Error(`no takes in ${RAW}`);
mkdirSync(OUT, { recursive: true });

const seconds = (file) =>
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
  );

const takes = readdirSync(RAW)
  .filter((f) => f.endsWith(".mp3"))
  .sort();
console.log(`speed ×${SPEED}`);
for (const take of takes) {
  const from = join(RAW, take);
  const to = join(OUT, take);
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    from,
    "-af",
    `${TRIM},atempo=${SPEED},loudnorm=I=-16:TP=-1.5:LRA=11`,
    "-ar",
    "44100",
    "-b:a",
    "128k",
    to,
  ]);
  console.log(
    `  ${take}  ${seconds(from).toFixed(2)}s → ${seconds(to).toFixed(2)}s` +
      `  ${(statSync(to).size / 1024).toFixed(0)} KB`,
  );
}
