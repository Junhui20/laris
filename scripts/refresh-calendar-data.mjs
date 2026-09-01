#!/usr/bin/env node
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
 * Adding a year the snapshot did not have before also means adding its import
 * to packages/api/src/calendar/mycal.ts — the maps there are explicit on
 * purpose, so nothing is bundled into the Worker without someone deciding to.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.MYCAL_API ?? "https://mycal-api.huijun00100101.workers.dev";
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "../packages/api/src/calendar/data");

const currentYear = new Date().getFullYear();

const response = await fetch(`${API}/v1/data/all`);
if (!response.ok) {
  console.error(`mycal returned HTTP ${response.status} — snapshot left untouched`);
  process.exit(1);
}
const { states, years } = await response.json();

await mkdir(DATA_DIR, { recursive: true });

const written = [];
await write("states.json", states);

for (const [year, data] of Object.entries(years)) {
  // Past years cannot price a future night, and every embedded byte ships in
  // the Worker bundle.
  if (Number(year) < currentYear) continue;
  if (data.holidays?.length) await write(`holidays-${year}.json`, data.holidays);
  if (data.schoolHolidays?.length) await write(`school-holidays-${year}.json`, data.schoolHolidays);
}

console.log(`refreshed from ${API}`);
for (const line of written) console.log(`  ${line}`);

async function write(name, value) {
  const path = join(DATA_DIR, name);
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const previous = await readFile(path, "utf8").catch(() => null);
  if (previous === next) {
    written.push(`unchanged  ${name}`);
    return;
  }
  await writeFile(path, next);
  written.push(`${previous === null ? "new       " : "updated   "} ${name}`);
}
