#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
/**
 * Refresh the embedded mycal snapshot in packages/api/src/calendar/data.
 *
 * Run this when the gazette moves — a new year is published, or an ad-hoc
 * *cuti peristiwa* is declared. Not on every build and never at request time:
 * mycal is our own project on a free Cloudflare tier, and Laris production must
 * not be the thing that eats its quota.
 *
 *   pnpm refresh:calendar
 *
 * Nothing is written until the entire response has been validated against
 * mycal's own schemas and every state token has been matched to a Laris
 * StateCode. A partially refreshed snapshot is worse than a stale one: stale
 * data is merely old, half-written data is wrong in a way nobody looks for.
 *
 * Adding a year the snapshot did not have before also means adding its import
 * to packages/api/src/calendar/mycal.ts — the maps there are explicit on
 * purpose, so nothing is bundled into the Worker without someone deciding to.
 */
import {
  holidayFileSchema,
  schoolHolidaysFileSchema,
  statesFileSchema,
} from "@catlabtech/mycal-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "packages/api/src/calendar/data");
const API = process.env.MYCAL_API ?? "https://mycal-api.huijun00100101.workers.dev";

/**
 * Every state token this snapshot may contain, mapped to its Laris StateCode.
 * mycal prefixes the two federal territories; Laris does not.
 *
 * Spelled out here rather than imported because `@laris/schema` is TypeScript
 * source that plain node cannot load. `refresh-calendar-data.test.ts` asserts
 * this agrees with `StateCode.options`, so the duplication cannot drift.
 */
export const LARIS_BY_MYCAL_CODE = new Map([
  ["johor", "johor"],
  ["kedah", "kedah"],
  ["kelantan", "kelantan"],
  ["melaka", "melaka"],
  ["negeri-sembilan", "negeri-sembilan"],
  ["pahang", "pahang"],
  ["perak", "perak"],
  ["perlis", "perlis"],
  ["pulau-pinang", "pulau-pinang"],
  ["sabah", "sabah"],
  ["sarawak", "sarawak"],
  ["selangor", "selangor"],
  ["terengganu", "terengganu"],
  ["kuala-lumpur", "kuala-lumpur"],
  ["wp-labuan", "labuan"],
  ["wp-putrajaya", "putrajaya"],
]);

/**
 * A state token we cannot map is the failure mycal.ts is built to refuse: it
 * would otherwise ride into a Business Profile looking like a state we support.
 */
export function unmappedStateTokens(tokens) {
  return [...new Set(tokens)].filter((token) => token !== "*" && !LARIS_BY_MYCAL_CODE.has(token));
}

// Importable for the tables above — a test asserts they match StateCode — and
// only refreshes when actually run.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await refresh();
}

async function refresh() {
  const currentYear = new Date().getFullYear();

  const response = await fetch(`${API}/v1/data/all`);
  if (!response.ok) {
    fail(`mycal returned HTTP ${response.status}`);
  }

  const body = await response.json();
  if (!body || typeof body !== "object" || !body.years || typeof body.years !== "object") {
    fail("response has no `years` object");
  }

  // ── validate everything, write nothing ──────────────────────────────────────
  const staged = new Map();

  const states = parse(statesFileSchema, body.states, "states");
  checkStateTokens(
    states.map((state) => state.code),
    "states",
  );
  staged.set("states.json", states);

  for (const [year, data] of Object.entries(body.years)) {
    // Past years cannot price a future night, and every embedded byte ships in
    // the Worker bundle.
    if (Number(year) < currentYear) continue;

    if (data?.holidays?.length) {
      const holidays = parse(holidayFileSchema, data.holidays, `holidays ${year}`);
      checkStateTokens(
        holidays.flatMap((h) => h.states),
        `holidays ${year}`,
      );
      staged.set(`holidays-${year}.json`, holidays);
    }
    if (data?.schoolHolidays?.length) {
      const school = parse(schoolHolidaysFileSchema, data.schoolHolidays, `school ${year}`);
      checkStateTokens(
        school.flatMap((s) => [...(s.states ?? []), ...(s.excludeStates ?? [])]),
        `school ${year}`,
      );
      staged.set(`school-holidays-${year}.json`, school);
    }
  }

  if (staged.size <= 1) fail("no holiday data for the current year or later");

  // ── write to temporaries, then swap them all in ─────────────────────────────
  await mkdir(DATA_DIR, { recursive: true });

  const written = [];
  const swaps = [];
  try {
    for (const [name, value] of staged) {
      const next = `${JSON.stringify(value, null, 2)}\n`;
      const path = join(DATA_DIR, name);
      const previous = await readFile(path, "utf8").catch(() => null);
      if (previous === next) {
        written.push(`unchanged  ${name}`);
        continue;
      }
      const temp = `${path}.tmp`;
      await writeFile(temp, next);
      swaps.push([temp, path]);
      written.push(`${previous === null ? "new       " : "updated   "} ${name}`);
    }
    for (const [temp, path] of swaps) await rename(temp, path);
  } catch (error) {
    await Promise.all(swaps.map(([temp]) => unlink(temp).catch(() => {})));
    fail(`write failed, snapshot left untouched: ${error.message}`);
  }

  // Same reason sync:styles formats its output: these files are generated, so
  // a `pnpm check` failure after a refresh is a broken generator rather than
  // something a human is expected to tidy by hand.
  const biome = createRequire(import.meta.url).resolve("@biomejs/biome/bin/biome");
  execFileSync(process.execPath, [biome, "format", "--write", DATA_DIR], { stdio: "inherit" });

  console.log(`refreshed from ${API}`);
  for (const line of written) console.log(`  ${line}`);
}

function parse(schema, value, what) {
  const result = schema.safeParse(value);
  if (!result.success) {
    fail(
      `${what} failed mycal's own schema:\n${result.error.issues
        .slice(0, 5)
        .map((i) => `    ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  return result.data;
}

function checkStateTokens(tokens, what) {
  const unknown = unmappedStateTokens(tokens);
  if (unknown.length > 0) fail(`${what} carries unmapped state codes: ${unknown.join(", ")}`);
}

function fail(message) {
  console.error(`${message} — snapshot left untouched`);
  process.exit(1);
}
