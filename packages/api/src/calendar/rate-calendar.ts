import { addDays, diffDays } from "@catlabtech/mycal-core";
import type { StateCode, stay } from "@laris/schema";
import { publicHolidays, schoolHolidays } from "./mycal.js";

/**
 * In `stay` the calendar does not decorate the price, it sets it. These are the
 * windows where a homestay charges peak, derived from the gazette rather than
 * typed in by hand twice a year.
 *
 * Everything here is a **suggestion**. Only the owner knows what their market
 * bears, so every window comes back `derived: true` for them to confirm or edit.
 * Nothing is applied.
 */

export type PeakMultipliers = {
  schoolHoliday: number;
  publicHoliday: number;
};

/**
 * Deliberately conservative. A suggestion that is too low gets raised; one that
 * is too high looks greedy and costs the owner's trust in every later suggestion.
 */
export const DEFAULT_PEAK_MULTIPLIERS: PeakMultipliers = {
  schoolHoliday: 1.3,
  publicHoliday: 1.4,
};

type DayReason = {
  multiplier: number;
  label: string;
};

export function deriveRateCalendar(options: {
  state: StateCode;
  baseRateCents: number;
  from: string;
  to: string;
  multipliers?: PeakMultipliers;
}): stay.RateOverride[] {
  const { state, baseRateCents, from, to } = options;
  const multipliers = options.multipliers ?? DEFAULT_PEAK_MULTIPLIERS;
  if (diffDays(from, to) < 0) return [];

  const reasons = new Map<string, DayReason>();
  const claim = (date: string, reason: DayReason) => {
    if (diffDays(from, date) < 0 || diffDays(date, to) < 0) return;
    // First claim wins, and school holidays claim first. A public holiday inside
    // a school break does not raise the rate again — the break is already peak,
    // and splitting it would hand the owner the same window three times to
    // approve. Only a public holiday standing on its own gets its own rate.
    if (!reasons.has(date)) reasons.set(date, reason);
  };

  for (const year of yearsSpanned(from, to)) {
    for (const holiday of schoolHolidays(state, year)) {
      for (const date of datesBetween(holiday.startDate, holiday.endDate)) {
        claim(date, { multiplier: multipliers.schoolHoliday, label: holiday.name.en });
      }
    }

    for (const holiday of publicHolidays(state, year)) {
      for (const date of datesBetween(holiday.date, holiday.endDate ?? holiday.date)) {
        claim(date, { multiplier: multipliers.publicHoliday, label: holiday.name.en });
      }
    }
  }

  return mergeWindows(reasons, from, to, baseRateCents);
}

/**
 * Consecutive days that agree on rate become one window, labelled by whichever
 * reason covers most of it. Two public holidays back to back — Eid and its
 * second day — are one window to approve, not two.
 */
function mergeWindows(
  reasons: ReadonlyMap<string, DayReason>,
  from: string,
  to: string,
  baseRateCents: number,
): stay.RateOverride[] {
  const windows: stay.RateOverride[] = [];
  let open: { start: string; end: string; reason: DayReason; labels: string[] } | null = null;

  const close = () => {
    if (!open) return;
    windows.push({
      from: open.start,
      to: open.end,
      rateCents: peakRateCents(baseRateCents, open.reason.multiplier),
      label: dominantLabel(open.labels),
      derived: true,
    });
    open = null;
  };

  for (const date of datesBetween(from, to)) {
    const reason = reasons.get(date);
    if (!reason) {
      close();
      continue;
    }
    if (open && open.reason.multiplier === reason.multiplier) {
      open.end = date;
      open.labels.push(reason.label);
      continue;
    }
    close();
    open = { start: date, end: date, reason, labels: [reason.label] };
  }
  close();

  return windows;
}

function dominantLabel(labels: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  let best = labels[0] ?? "";
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

/** Rounded to the nearest ringgit — a suggested price should look like a price. */
function peakRateCents(baseRateCents: number, multiplier: number): number {
  return Math.round((baseRateCents * multiplier) / 100) * 100;
}

function datesBetween(from: string, to: string): string[] {
  const span = diffDays(from, to);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, offset) => addDays(from, offset));
}

function yearsSpanned(from: string, to: string): number[] {
  const first = Number(from.slice(0, 4));
  const last = Number(to.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
}
