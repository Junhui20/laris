/**
 * Run a TypeScript entry point.
 *
 * The plan compiler has to read the Business Profile, and the Profile is a
 * TypeScript module in another package — so the compiler is TypeScript too, and
 * Node cannot execute it directly. esbuild bundles it to a temporary ESM file
 * first, through its JavaScript API rather than its binary: the same toolchain
 * Remotion already uses, no new runtime, no path to an executable to get wrong
 * on someone else's operating system.
 *
 *   node scripts/run-ts.mjs scripts/build-plan.ts
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const entry = process.argv[2];
if (!entry) throw new Error("usage: node scripts/run-ts.mjs <entry.ts>");

const out = mkdtempSync(join(tmpdir(), "laris-render-"));
const bundled = join(out, `${basename(entry, ".ts")}.mjs`);

try {
  await build({
    entryPoints: [resolve(entry)],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: bundled,
    logLevel: "warning",
  });
  // The bundle runs from a temp directory, so it cannot find the package from
  // its own location. Hand it the root explicitly rather than leaving it to
  // guess from a working directory.
  execFileSync(process.execPath, [bundled, ...process.argv.slice(3)], {
    stdio: "inherit",
    env: { ...process.env, LARIS_RENDER_ROOT: dirname(dirname(fileURLToPath(import.meta.url))) },
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
