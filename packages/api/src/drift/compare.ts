import { type Identity, type Mismatch, type OpeningHours, StateCode } from "@laris/schema";
import { stateOfficial } from "../site/labels.js";
import {
  normalizeAddress,
  normalizeName,
  normalizePhone,
  normalizeWeeklyHours,
} from "./normalize.js";
import type { ExtractedAddress, ExtractedIdentity, ExtractedValue } from "./types.js";

/**
 * Compare only facts strong enough to act on. Missing or likely evidence is
 * deliberately silent: a short report of certain drift is the product.
 */
export function compareIdentity(extracted: ExtractedIdentity, profile: Identity): Mismatch[] {
  const mismatches: Mismatch[] = [];

  if (
    isCertain(extracted.name) &&
    normalizeName(extracted.name.value) !== normalizeName(profile.name)
  ) {
    mismatches.push(mismatch("name", profile.name, extracted.name));
  }

  if (isCertain(extracted.phone)) {
    const channelPhone = normalizePhone(extracted.phone.value);
    const profilePhone = normalizePhone(profile.phone);
    if (channelPhone && profilePhone && channelPhone !== profilePhone) {
      mismatches.push(mismatch("phone", profile.phone, extracted.phone));
    }
  }

  if (isCertain(extracted.address) && addressCertainlyDisagrees(extracted.address.value, profile)) {
    mismatches.push(mismatch("address", formatProfileAddress(profile), extracted.address));
  }

  if (isCertain(extracted.hours) && hoursCertainlyDisagree(extracted.hours.value, profile.hours)) {
    mismatches.push(mismatch("hours", formatHours(profile.hours), extracted.hours));
  }

  return mismatches;
}

function addressCertainlyDisagrees(channel: ExtractedAddress, profile: Identity): boolean {
  if (channel.postcode) {
    const channelPostcode = extractMalaysianPostcode(channel.postcode);
    const profilePostcode = extractMalaysianPostcode(profile.postcode);
    if (channelPostcode && profilePostcode && channelPostcode !== profilePostcode) return true;
  }

  if (channel.state) {
    const channelState = canonicalStateCode(channel.state);
    if (channelState && channelState !== profile.state) return true;
  }

  // Street text alone is not enough for a `certain` mismatch. Malaysian unit
  // numbers routinely move punctuation and spaces ("No. 12-A" / "12A"), and
  // road names carry meaningful numbers too. A missed drift is cheaper than a
  // false report, so V1 requires a contradictory postcode or canonical state.
  return false;
}

function hoursCertainlyDisagree(
  channel: readonly OpeningHours[],
  profile: readonly OpeningHours[],
): boolean {
  const channelHours = normalizeWeeklyHours(channel);
  const profileHours = normalizeWeeklyHours(profile);

  for (const [weekday, channelIntervals] of channelHours) {
    const profileIntervals = profileHours.get(weekday);
    // With the current schema, an absent weekday means "unknown", not
    // explicitly closed. Only two stated schedules can certainly disagree.
    if (!profileIntervals) continue;
    if (serializeIntervals(channelIntervals) !== serializeIntervals(profileIntervals)) {
      return true;
    }
  }

  return false;
}

function mismatch<T>(
  field: Mismatch["field"],
  profileValue: string,
  channel: ExtractedValue<T>,
): Mismatch {
  return {
    field,
    profileValue,
    channelValue: channel.raw,
    confidence: "certain",
    source: channel.source,
  };
}

function isCertain<T>(value: ExtractedValue<T> | undefined): value is ExtractedValue<T> {
  return value?.confidence === "certain";
}

function formatProfileAddress(profile: Identity): string {
  return [
    ...profile.addressLines,
    profile.area,
    profile.postcode,
    stateOfficial(profile.state),
  ].join(", ");
}

function formatHours(hours: readonly OpeningHours[]): string {
  return [...normalizeWeeklyHours(hours).entries()]
    .map(
      ([weekday, intervals]) =>
        `${WEEKDAY_LABELS[weekday] ?? "Unknown day"} ${intervals
          .map(
            ({ opens, closes, closesNextDay }) =>
              `${opens}–${closes}${closesNextDay ? " (next day)" : ""}`,
          )
          .join(", ")}`,
    )
    .join("; ");
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function serializeIntervals(
  intervals: readonly Pick<OpeningHours, "opens" | "closes" | "closesNextDay">[],
): string {
  return intervals
    .map(({ opens, closes, closesNextDay }) => `${opens}-${closes}${closesNextDay ? "+1" : ""}`)
    .join(",");
}

function extractMalaysianPostcode(value: string): string | null {
  const matches = [...value.normalize("NFKC").matchAll(/(?:^|\D)(\d{5})(?!\d)/g)].map(
    (match) => match[1],
  );
  const unique = [...new Set(matches)];
  return unique.length === 1 ? (unique[0] ?? null) : null;
}

/**
 * Natural-language aliases belong to mycal. Until its snapshot/resolver is on
 * main, only the schema's own canonical spellings are certain enough to
 * compare; an unresolved addressRegion is missing evidence, not a mismatch.
 */
function canonicalStateCode(value: string): StateCode | null {
  const candidate = normalizeAddress(value).replace(/\s+/g, "-");
  const parsed = StateCode.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
