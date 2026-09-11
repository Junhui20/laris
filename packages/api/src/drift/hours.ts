import type { OpeningHours } from "@laris/schema";

const WEEKDAY_BY_CODE: Readonly<Record<string, number>> = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};

const DAY_EXPRESSION = "(?:Su|Mo|Tu|We|Th|Fr|Sa)(?:\\s*[-,]\\s*(?:Su|Mo|Tu|We|Th|Fr|Sa))*";
const HOURS_PATTERN = new RegExp(
  `^(${DAY_EXPRESSION})\\s+([0-2]\\d:[0-5]\\d)\\s*[-–—]\\s*([0-2]\\d:[0-5]\\d)$`,
);

/** Parse schema.org's compact `openingHours` syntax without guessing. */
export function parseOpeningHours(values: readonly string[]): OpeningHours[] | null {
  if (values.length === 0) return null;

  const parsed: OpeningHours[] = [];
  for (const value of values) {
    const match = HOURS_PATTERN.exec(value.normalize("NFKC").trim());
    if (!match) return null;

    const [, dayExpression, opens, closes] = match;
    if (!dayExpression || !isLocalTime(opens) || !isLocalTime(closes) || opens === closes) {
      return null;
    }

    const weekdays = expandWeekdays(dayExpression);
    if (!weekdays) return null;
    for (const weekday of weekdays) {
      parsed.push({ weekday, opens, closes, closesNextDay: closes < opens });
    }
  }

  const unique = new Map(
    parsed.map((entry) => [
      `${entry.weekday}-${entry.opens}-${entry.closes}-${entry.closesNextDay}`,
      entry,
    ]),
  );
  return [...unique.values()].sort(
    (left, right) => left.weekday - right.weekday || left.opens.localeCompare(right.opens),
  );
}

function expandWeekdays(expression: string): number[] | null {
  const days: number[] = [];

  for (const part of expression.split(/\s*,\s*/)) {
    const [startCode, endCode, ...rest] = part.split(/\s*-\s*/);
    if (!startCode || rest.length > 0) return null;

    const start = WEEKDAY_BY_CODE[startCode];
    if (start === undefined) return null;
    if (!endCode) {
      days.push(start);
      continue;
    }

    const end = WEEKDAY_BY_CODE[endCode];
    if (end === undefined) return null;
    for (let day = start; ; day = (day + 1) % 7) {
      days.push(day);
      if (day === end) break;
    }
  }

  return [...new Set(days)];
}

function isLocalTime(value: string | undefined): value is string {
  return value !== undefined && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
