import type { LocalizedString } from "@catlabtech/mycal-core";
import { diffDays } from "@catlabtech/mycal-core";
import type { BusinessContext, CalendarEntry, StateCode, Trilingual } from "@laris/schema";
import { larisStateCode, publicHolidays, schoolHolidays } from "./mycal.js";

/**
 * The holidays themselves, for `BusinessContext.calendar`.
 *
 * Names come through in Malay, English and Chinese because copy has to address
 * the audience in its own language — "Hari Raya Aidilfitri", "Chinese New Year"
 * and "农历新年" are the same window and three different posts.
 */
export function deriveCalendarEntries(options: {
  state: StateCode;
  from: string;
  to: string;
}): CalendarEntry[] {
  const { state, from, to } = options;
  if (diffDays(from, to) < 0) return [];

  const overlaps = (start: string, end: string) =>
    diffDays(start, to) >= 0 && diffDays(from, end) >= 0;

  const entries: CalendarEntry[] = [];

  for (const year of yearsSpanned(from, to)) {
    for (const holiday of publicHolidays(state, year)) {
      const end = holiday.endDate ?? holiday.date;
      if (!overlaps(holiday.date, end)) continue;
      entries.push({
        date: holiday.date,
        ...(holiday.endDate && { endDate: holiday.endDate }),
        kind: "public_holiday",
        name: trilingual(holiday.name),
        states: holiday.states.map(larisStateCode),
        source: "mycal",
      });
    }

    for (const holiday of schoolHolidays(state, year)) {
      if (!overlaps(holiday.startDate, holiday.endDate)) continue;
      entries.push({
        date: holiday.startDate,
        endDate: holiday.endDate,
        kind: "school_holiday",
        name: trilingual(holiday.name),
        // Resolved for this Merchant's Kumpulan already, so it is theirs alone.
        states: [state],
        source: "mycal",
      });
    }
  }

  return entries.sort((left, right) => left.date.localeCompare(right.date));
}

function trilingual(name: LocalizedString): Trilingual {
  return { ms: name.ms, en: name.en, ...(name.zh && { zh: name.zh }) };
}

function yearsSpanned(from: string, to: string): number[] {
  const first = Number(from.slice(0, 4));
  const last = Number(to.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
}

/**
 * The Business Profile with its mycal window refreshed.
 *
 * Entries the merchant wrote themselves — promos, closures, their own events —
 * are never touched. Only previously derived `mycal` entries are replaced, so
 * running this twice is the same as running it once.
 */
export function withDerivedCalendar(
  ctx: BusinessContext,
  range: { from: string; to: string },
): BusinessContext {
  const merchantEntries = ctx.calendar.filter((entry) => entry.source !== "mycal");
  const derived = deriveCalendarEntries({ state: ctx.identity.state, ...range });

  return {
    ...ctx,
    calendar: [...merchantEntries, ...derived].sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
  };
}
