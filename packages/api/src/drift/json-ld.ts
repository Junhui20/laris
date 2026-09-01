import type { OpeningHours } from "@laris/schema";
import { parseOpeningHours } from "./hours.js";
import { normalizeWeeklyHours, serializeWeeklyHours } from "./normalize.js";
import type { ExtractedAddress, ExtractedIdentity, ExtractedValue } from "./types.js";

const SUPPORTED_TYPES = new Map([
  ["CafeOrCoffeeShop", 42],
  ["Restaurant", 42],
  ["LodgingBusiness", 40],
  ["LocalBusiness", 35],
  ["Organization", 20],
]);

const WEEKDAY_BY_NAME: Readonly<Record<string, number>> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type JsonObject = Record<string, unknown>;

export function extractJsonLdIdentity(documents: readonly unknown[]): ExtractedIdentity {
  const candidates = documents.flatMap(collectEntities).filter(isSupportedEntity);
  const entity = candidates.sort((left, right) => scoreEntity(right) - scoreEntity(left))[0];
  if (!entity) return {};

  const name = nonemptyString(entity.name);
  const phone = nonemptyString(entity.telephone);
  const address = extractAddress(entity.address);
  const specificationHours = extractOpeningHours(entity.openingHoursSpecification);
  const compactHours = parseOpeningHours(stringArray(entity.openingHours));
  const hours = specificationHours.length > 0 ? specificationHours : (compactHours ?? []);

  return {
    ...(name && { name: evidence(name, name) }),
    ...(phone && { phone: evidence(phone, phone) }),
    ...(address && { address: evidence(address.value, address.raw) }),
    ...(hours.length > 0 && {
      hours: evidence(hours, serializeWeeklyHours(normalizeWeeklyHours(hours))),
    }),
  };
}

function evidence<T>(value: T, raw: string): ExtractedValue<T> {
  return { value, raw, source: "json-ld", confidence: "certain" };
}

function collectEntities(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(collectEntities);
  if (!isObject(value)) return [];

  const graph = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(collectEntities) : [];
  return [value, ...graph];
}

function isSupportedEntity(entity: JsonObject): boolean {
  return entityTypes(entity).some((type) => SUPPORTED_TYPES.has(type));
}

function scoreEntity(entity: JsonObject): number {
  const typeScore = Math.max(
    0,
    ...entityTypes(entity).map((type) => SUPPORTED_TYPES.get(type) ?? 0),
  );
  const fieldScore = [
    entity.name,
    entity.telephone,
    entity.address,
    entity.openingHoursSpecification,
  ].filter((value) => value !== undefined).length;
  return typeScore + fieldScore;
}

function entityTypes(entity: JsonObject): string[] {
  const raw = entity["@type"];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .map(nonemptyString)
    .filter((value): value is string => value !== null)
    .map((value) => value.split(/[\/#]/).filter(Boolean).at(-1) ?? value);
}

function extractAddress(value: unknown): { value: ExtractedAddress; raw: string } | null {
  const direct = nonemptyString(value);
  if (direct) return { value: { streetAddress: direct }, raw: direct };
  if (!isObject(value)) return null;

  const streetAddress = stringOrJoinedStrings(value.streetAddress);
  const area = nonemptyString(value.addressLocality);
  const postcode = nonemptyString(value.postalCode);
  const state = nonemptyString(value.addressRegion);
  const address = {
    ...(streetAddress && { streetAddress }),
    ...(area && { area }),
    ...(postcode && { postcode }),
    ...(state && { state }),
  };
  const raw = [streetAddress, area, postcode, state].filter(Boolean).join(", ");
  return raw ? { value: address, raw } : null;
}

function extractOpeningHours(value: unknown): OpeningHours[] {
  const specifications = Array.isArray(value) ? value : [value];
  const hours: OpeningHours[] = [];

  for (const specification of specifications) {
    if (!isObject(specification)) continue;

    const opens = localTime(specification.opens);
    const closes = localTime(specification.closes);
    if (!opens || !closes || opens === closes) continue;

    const rawDays = Array.isArray(specification.dayOfWeek)
      ? specification.dayOfWeek
      : [specification.dayOfWeek];

    for (const rawDay of rawDays) {
      const weekday = weekdayNumber(rawDay);
      if (weekday === null) continue;
      hours.push({
        weekday,
        opens,
        closes,
        closesNextDay: closes < opens,
      });
    }
  }

  const unique = new Map(
    hours.map((entry) => [
      `${entry.weekday}-${entry.opens}-${entry.closes}-${entry.closesNextDay}`,
      entry,
    ]),
  );
  return [...unique.values()].sort(
    (left, right) => left.weekday - right.weekday || left.opens.localeCompare(right.opens),
  );
}

function weekdayNumber(value: unknown): number | null {
  const name = nonemptyString(value)?.split(/[\/#]/).filter(Boolean).at(-1)?.toLowerCase();
  return name === undefined ? null : (WEEKDAY_BY_NAME[name] ?? null);
}

function localTime(value: unknown): string | null {
  const text = nonemptyString(value);
  if (!text) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(text);
  return match ? `${match[1]}:${match[2]}` : null;
}

function stringOrJoinedStrings(value: unknown): string | null {
  if (!Array.isArray(value)) return nonemptyString(value);
  const strings = value.map(nonemptyString).filter((part): part is string => part !== null);
  return strings.length > 0 ? strings.join(", ") : null;
}

function stringArray(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(nonemptyString).filter((part): part is string => part !== null);
}

function nonemptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
