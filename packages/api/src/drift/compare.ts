import type { Identity, Mismatch, OpeningHours } from "@laris/schema";
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
  if (
    channel.postcode &&
    normalizeAddress(channel.postcode) !== normalizeAddress(profile.postcode)
  ) {
    return true;
  }

  if (channel.state) {
    const channelState = normalizeState(channel.state);
    const profileState = normalizeState(profile.state);
    if (channelState && profileState && channelState !== profileState) return true;
  }

  if (channel.streetAddress) {
    const profileStreet = normalizeAddress(profile.addressLines.join(" "));
    const channelStreet = normalizeAddress(channel.streetAddress);
    if (
      profileStreet === channelStreet ||
      profileStreet.includes(channelStreet) ||
      channelStreet.includes(profileStreet)
    ) {
      return false;
    }

    const profileNumbers = numericAddressTokens(profileStreet);
    const channelNumbers = numericAddressTokens(channelStreet);
    if (profileNumbers.length > 0 && channelNumbers.length > 0) {
      return !profileNumbers.some((value) => channelNumbers.includes(value));
    }
  }

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
    if (
      !profileIntervals ||
      serializeIntervals(channelIntervals) !== serializeIntervals(profileIntervals)
    ) {
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
  return [...profile.addressLines, profile.area, profile.postcode, profile.state].join(", ");
}

function formatHours(hours: readonly OpeningHours[]): string {
  return [...normalizeWeeklyHours(hours).entries()]
    .map(([weekday, intervals]) => `${weekday}:${serializeIntervals(intervals)}`)
    .join(";");
}

function serializeIntervals(
  intervals: readonly Pick<OpeningHours, "opens" | "closes" | "closesNextDay">[],
): string {
  return intervals
    .map(({ opens, closes, closesNextDay }) => `${opens}-${closes}${closesNextDay ? "+1" : ""}`)
    .join(",");
}

function numericAddressTokens(value: string): string[] {
  return value.split(" ").filter((token) => /^\d+[a-z]?$/.test(token));
}

function normalizeState(value: string): string {
  const normalized = normalizeAddress(value);
  const aliases: Readonly<Record<string, string>> = {
    kl: "kuala lumpur",
    penang: "pulau pinang",
    putrajaya: "putrajaya",
    "wp putrajaya": "putrajaya",
    labuan: "labuan",
    "wp labuan": "labuan",
  };
  return aliases[normalized] ?? normalized;
}
