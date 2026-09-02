import type { Holiday, SchoolHoliday, State } from "@catlabtech/mycal-core";
import {
  calculateReplacementHolidays,
  filterHolidays,
  filterSchoolHolidays,
  getStateByCode,
  holidayFileSchema,
  schoolHolidaysFileSchema,
  statesFileSchema,
} from "@catlabtech/mycal-core";
import { StateCode } from "@laris/schema";
import holidays2026 from "./data/holidays-2026.json";
import holidays2027 from "./data/holidays-2027.json";
import schoolHolidays2026 from "./data/school-holidays-2026.json";
import statesData from "./data/states.json";

/**
 * mycal data is embedded, not fetched.
 *
 * `@catlabtech/mycal-core` ships logic and types only — every function takes the
 * gazette data as an argument — so the data has to live somewhere. It lives here,
 * as a committed snapshot refreshed by `pnpm refresh:calendar`. Calendar data
 * changes a few times a year, and mycal's public API runs on a free Cloudflare
 * tier that Laris production must not be eating.
 *
 * The snapshot is parsed through mycal's own exported schemas rather than cast.
 * It is committed data, so this cannot fail in production without failing in
 * CI first — which is the point: the failure lands on whoever refreshed it.
 * Measured at 3.2 ms for all four files, paid once per isolate, which is well
 * inside a Worker's startup budget and cheaper than one wrong holiday.
 */

const STATES = statesFileSchema.parse(statesData) as readonly State[];

const HOLIDAYS_BY_YEAR: Readonly<Record<number, readonly Holiday[]>> = {
  2026: holidayFileSchema.parse(holidays2026) as readonly Holiday[],
  2027: holidayFileSchema.parse(holidays2027) as readonly Holiday[],
};

const SCHOOL_HOLIDAYS_BY_YEAR: Readonly<Record<number, readonly SchoolHoliday[]>> = {
  2026: schoolHolidaysFileSchema.parse(schoolHolidays2026) as readonly SchoolHoliday[],
};

/**
 * mycal prefixes the two federal territories; Laris's `StateCode` does not.
 * Without this the two codes simply never match and a Putrajaya or Labuan
 * Merchant silently gets no holidays at all — no error, just an empty calendar,
 * which is the hardest kind of wrong to notice.
 */
const MYCAL_CODE_BY_STATE: Partial<Record<StateCode, string>> = {
  labuan: "wp-labuan",
  putrajaya: "wp-putrajaya",
};

const STATE_BY_MYCAL_CODE: Readonly<Record<string, StateCode>> = Object.fromEntries(
  Object.entries(MYCAL_CODE_BY_STATE).map(([state, code]) => [code, state as StateCode]),
);

const LARIS_STATE_CODES: ReadonlySet<string> = new Set<string>(StateCode.options);

export function mycalCode(state: StateCode): string {
  return MYCAL_CODE_BY_STATE[state] ?? state;
}

/**
 * The inverse, for carrying mycal's own `states` lists back into the Profile.
 *
 * Throws rather than casting an unrecognised token into a `StateCode`. A new
 * upstream code should stop the build of a calendar, not travel through the
 * Business Profile disguised as a state we support.
 */
export function larisStateCode(code: string): StateCode | "*" {
  if (code === "*") return "*";
  const mapped = STATE_BY_MYCAL_CODE[code];
  if (mapped) return mapped;
  if (isLarisStateCode(code)) return code;
  throw new Error(`mycal state "${code}" has no Laris StateCode`);
}

function isLarisStateCode(code: string): code is StateCode {
  return LARIS_STATE_CODES.has(code);
}

export function getState(state: StateCode): State {
  const resolved = getStateByCode(mycalCode(state), STATES);
  if (!resolved) throw new Error(`no mycal state for "${state}"`);
  return resolved;
}

export type Coverage = {
  /** Years the snapshot holds public holidays for. */
  holidays: number[];
  /** Years it holds a school calendar for — the takwim lags the gazette. */
  schoolHolidays: number[];
  /**
   * Years whose public holidays are confirmed-only, meaning the lunar dates
   * (Hari Raya, Eid al-Adha, Awal Muharram) are still tentative upstream and
   * therefore absent here. A caller looking at one of these years is seeing a
   * floor, not the full calendar, and should say so rather than imply quiet.
   */
  tentativeOmitted: number[];
};

/** What the snapshot can actually answer for. Asking outside it returns nothing. */
export function coveredYears(): Coverage {
  const holidays = Object.keys(HOLIDAYS_BY_YEAR).map(Number).sort();
  return {
    holidays,
    schoolHolidays: Object.keys(SCHOOL_HOLIDAYS_BY_YEAR).map(Number).sort(),
    tentativeOmitted: holidays.filter((year) =>
      (HOLIDAYS_BY_YEAR[year] ?? []).some((holiday) => holiday.status !== "confirmed"),
    ),
  };
}

/**
 * Gazetted public holidays for this state, with their replacements.
 *
 * *Cuti ganti* are not in the gazette file — mycal derives them from the state's
 * own weekend, which is why this needs the `State` and not just a code. Kelantan
 * rests Friday–Saturday, so Labour Day 2026 falling on a Friday earns a
 * replacement there and nowhere else.
 *
 * Leaving them out was not a rounding error: a replacement day is an ordinary
 * working day turned into a holiday, which for a homestay is exactly a night
 * that fills up.
 *
 * Replacements are calculated from the *whole* gazette rather than the confirmed
 * subset on purpose: rolling a holiday forward has to know which days are
 * already taken, and a tentative lunar date still occupies its day. But mycal
 * excludes only `cancelled` there and copies the source's status onto what it
 * builds, so a tentative holiday yields a tentative replacement — which would
 * re-enter a confirmed-only calendar wearing a different id. Hence the status
 * check below rather than a narrower input.
 */
export function publicHolidays(state: StateCode, year: number): readonly Holiday[] {
  const all = HOLIDAYS_BY_YEAR[year];
  if (!all) return [];

  const gazetted = filterHolidays(all, { year, state: mycalCode(state), status: "confirmed" });
  const replacements = calculateReplacementHolidays(all, getState(state));

  const byId = new Map<string, Holiday>();
  for (const holiday of [...gazetted, ...replacements]) {
    if (holiday.status !== "confirmed") continue;
    if (!holiday.isPublicHoliday) continue;
    if (!holiday.date.startsWith(`${year}-`)) continue;
    byId.set(holiday.id, holiday);
  }

  return [...byId.values()].sort((left, right) => left.date.localeCompare(right.date));
}

/**
 * School holidays for this state's Kumpulan. The A/B split is why this takes a
 * state and not just a year: Kedah, Kelantan and Terengganu break on different
 * dates from everywhere else, and for a homestay those dates are the price.
 */
export function schoolHolidays(state: StateCode, year: number): readonly SchoolHoliday[] {
  const all = SCHOOL_HOLIDAYS_BY_YEAR[year];
  if (!all) return [];
  return filterSchoolHolidays(all, getState(state).group, mycalCode(state));
}
