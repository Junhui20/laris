import type { LocalizedString } from "@catlabtech/mycal-core";
import { diffDays } from "@catlabtech/mycal-core";
import type { BusinessContext, CalendarEntry, StateCode, Trilingual } from "@laris/schema";
import { larisStateCode, publicHolidays, schoolHolidays } from "./mycal.js";

/**
 * The holidays themselves, for `BusinessContext.calendar`.
 *
 * Names carry Malay and English always, and Chinese where the gazette data has
 * it. Chinese is genuinely partial upstream — roughly half the public holidays
 * and none of the school-holiday rows — so a caller writing Chinese copy has to
 * handle its absence. Claiming three languages when the data holds two and a
 * half would just move the failure to whoever trusted the claim.
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
 * The Business Profile with one window of its mycal calendar refreshed.
 *
 * This replaces a range, not the whole calendar. Entries the merchant wrote
 * themselves are never touched, and neither are mycal entries outside the
 * window — refreshing 2026 on a Profile that also holds 2027 used to delete
 * every 2027 entry, silently, because they were derived too.
 *
 * Running it twice over the same range is still the same as running it once.
 */
export function withDerivedCalendar(
  ctx: BusinessContext,
  range: { from: string; to: string },
): BusinessContext {
  const kept = ctx.calendar.filter((entry) => {
    if (entry.source !== "mycal") return true;
    const end = entry.endDate ?? entry.date;
    const overlapsWindow = diffDays(entry.date, range.to) >= 0 && diffDays(range.from, end) >= 0;
    return !overlapsWindow;
  });
  const derived = deriveCalendarEntries({ state: ctx.identity.state, ...range });

  return {
    ...ctx,
    calendar: [...kept, ...derived].sort((left, right) => left.date.localeCompare(right.date)),
  };
}
