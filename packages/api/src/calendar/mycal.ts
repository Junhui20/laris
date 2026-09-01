import type { Holiday, SchoolHoliday, State } from "@catlabtech/mycal-core";
import { filterHolidays, filterSchoolHolidays, getStateByCode } from "@catlabtech/mycal-core";
import type { StateCode } from "@laris/schema";
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
 */

const STATES = statesData as unknown as readonly State[];

const HOLIDAYS_BY_YEAR: Readonly<Record<number, readonly Holiday[]>> = {
  2026: holidays2026 as unknown as readonly Holiday[],
  2027: holidays2027 as unknown as readonly Holiday[],
};

const SCHOOL_HOLIDAYS_BY_YEAR: Readonly<Record<number, readonly SchoolHoliday[]>> = {
  2026: schoolHolidays2026 as unknown as readonly SchoolHoliday[],
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

export function mycalCode(state: StateCode): string {
  return MYCAL_CODE_BY_STATE[state] ?? state;
}

/** The inverse, for carrying mycal's own `states` lists back into the Profile. */
export function larisStateCode(code: string): StateCode {
  return STATE_BY_MYCAL_CODE[code] ?? (code as StateCode);
}

export function getState(state: StateCode): State {
  const resolved = getStateByCode(mycalCode(state), STATES);
  if (!resolved) throw new Error(`no mycal state for "${state}"`);
  return resolved;
}

/** The years the snapshot actually covers. Asking outside it returns nothing. */
export function coveredYears(): { holidays: number[]; schoolHolidays: number[] } {
  return {
    holidays: Object.keys(HOLIDAYS_BY_YEAR).map(Number).sort(),
    schoolHolidays: Object.keys(SCHOOL_HOLIDAYS_BY_YEAR).map(Number).sort(),
  };
}

/** Gazetted public holidays that apply to this state, cancelled ones excluded. */
export function publicHolidays(state: StateCode, year: number): readonly Holiday[] {
  const all = HOLIDAYS_BY_YEAR[year];
  if (!all) return [];
  return filterHolidays(all, { year, state: mycalCode(state), status: "confirmed" }).filter(
    (holiday) => holiday.isPublicHoliday,
  );
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
