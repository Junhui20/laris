import type { OpeningHours } from "@laris/schema";

const ADDRESS_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  jln: "jalan",
};

/**
 * Normalisation here is intentionally conservative. Drift Check loses trust
 * through false positives, so we only erase differences that cannot change a
 * value's meaning.
 */
function normalizeText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").trim();
}

export function normalizeName(value: string): string {
  return normalizeText(value).replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Returns an international digits-only representation, including the country
 * code. Malaysian national numbers are promoted to country code 60.
 */
export function normalizePhone(value: string): string | null {
  const withoutExtension = value
    .normalize("NFKC")
    .replace(/^\s*tel:\s*/i, "")
    .split(/\s+(?:ext(?:ension)?\.?|x|samb(?:ungan)?\.?)\s*\d*$/i, 1)[0]
    ?.trim();

  if (!withoutExtension || /[a-z]/i.test(withoutExtension)) return null;

  const hasInternationalPrefix = /^\s*(?:\+|00)/.test(withoutExtension);
  let digits = withoutExtension.replace(/\D/g, "");
  if (digits.length === 0) return null;

  if (digits.startsWith("0060")) digits = digits.slice(2);

  if (digits.startsWith("60")) {
    const national = digits.slice(2).replace(/^0/, "");
    return national.length >= 8 && national.length <= 10 ? `60${national}` : null;
  }

  if (!hasInternationalPrefix && digits.startsWith("0")) {
    const national = digits.slice(1);
    return national.length >= 8 && national.length <= 10 ? `60${national}` : null;
  }

  if (hasInternationalPrefix) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  return null;
}

export function normalizeAddress(value: string): string {
  return normalizeText(value)
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => ADDRESS_TOKEN_ALIASES[token] ?? token)
    .join(" ");
}

type HoursInterval = Pick<OpeningHours, "opens" | "closes" | "closesNextDay">;

export type NormalizedWeeklyHours = ReadonlyMap<number, readonly HoursInterval[]>;

export function normalizeWeeklyHours(hours: readonly OpeningHours[]): NormalizedWeeklyHours {
  const byWeekday = new Map<number, HoursInterval[]>();

  for (const entry of hours) {
    const intervals = byWeekday.get(entry.weekday) ?? [];
    intervals.push({
      opens: entry.opens,
      closes: entry.closes,
      closesNextDay: entry.closesNextDay,
    });
    byWeekday.set(entry.weekday, intervals);
  }

  for (const intervals of byWeekday.values()) {
    intervals.sort((a, b) => {
      const left = `${a.opens}-${a.closes}-${Number(a.closesNextDay)}`;
      const right = `${b.opens}-${b.closes}-${Number(b.closesNextDay)}`;
      return left.localeCompare(right);
    });
  }

  return new Map([...byWeekday.entries()].sort(([left], [right]) => left - right));
}

export function serializeWeeklyHours(hours: NormalizedWeeklyHours): string {
  return [...hours.entries()]
    .map(([weekday, intervals]) =>
      intervals
        .map(
          ({ opens, closes, closesNextDay }) =>
            `${weekday}:${opens}-${closes}${closesNextDay ? "+1" : ""}`,
        )
        .join(","),
    )
    .join(";");
}
