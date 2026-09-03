import { DomUtils, parseDocument } from "htmlparser2";
import { parseOpeningHours } from "./hours.js";
import { extractJsonLdIdentity } from "./json-ld.js";
import { normalizeWeeklyHours, serializeWeeklyHours } from "./normalize.js";
import type {
  EvidenceConfidence,
  EvidenceSource,
  ExtractedAddress,
  ExtractedIdentity,
  ExtractedValue,
} from "./types.js";

type HtmlElement = ReturnType<typeof DomUtils.getElementsByTagName>[number];

const MICRODATA_TYPE_SCORES: Readonly<Record<string, number>> = {
  CafeOrCoffeeShop: 42,
  Restaurant: 42,
  LodgingBusiness: 40,
  LocalBusiness: 35,
  Organization: 20,
};

/** Parse once, then fill each field from the strongest source that has it. */
export function extractIdentity(html: string): ExtractedIdentity {
  const document = parseDocument(html, {
    decodeEntities: true,
    lowerCaseAttributeNames: true,
    lowerCaseTags: true,
  });

  const jsonLd = extractJsonLdIdentity(extractJsonLdDocuments(document));
  const microdata = extractMicrodata(document);
  const meta = extractMeta(document);
  const text = extractVisibleFallbacks(document);

  return {
    name: jsonLd.name ?? microdata.name ?? meta.name ?? text.name,
    phone: jsonLd.phone ?? microdata.phone ?? meta.phone ?? text.phone,
    address: jsonLd.address ?? microdata.address ?? meta.address ?? text.address,
    hours: jsonLd.hours ?? microdata.hours ?? meta.hours ?? text.hours,
  };
}

function extractJsonLdDocuments(document: ReturnType<typeof parseDocument>): unknown[] {
  const documents: unknown[] = [];
  const scripts = DomUtils.getElementsByTagName("script", document);

  for (const script of scripts) {
    if (script.attribs.type?.trim().toLowerCase() !== "application/ld+json") continue;
    const raw = DomUtils.textContent(script)
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "")
      .replace(/;\s*$/, "")
      .trim();
    if (!raw) continue;

    try {
      documents.push(JSON.parse(raw));
    } catch {
      // One broken script must not hide a later valid JSON-LD block.
    }
  }

  return documents;
}

function extractMicrodata(document: ReturnType<typeof parseDocument>): ExtractedIdentity {
  const scopes = DomUtils.findAll(
    (element) => "itemscope" in element.attribs && microdataScopeScore(element) > 0,
    document.children,
  ).sort((left, right) => microdataScopeScore(right) - microdataScopeScore(left));
  const scope = scopes[0];
  if (!scope) return {};

  const name = elementValue(firstByItemProp(scope, "name"));
  const phone = elementValue(firstByItemProp(scope, "telephone"));
  const address = microdataAddress(scope);
  const openingHours = allByItemProp(scope, "openinghours")
    .map(elementValue)
    .filter((value): value is string => value !== null);
  const hours = parseOpeningHours(openingHours);

  return {
    ...(name && { name: evidence(name, name, "microdata", "certain") }),
    ...(phone && { phone: evidence(phone, phone, "microdata", "certain") }),
    ...(address && { address: evidence(address.value, address.raw, "microdata", "certain") }),
    ...(hours && {
      hours: evidence(
        hours,
        serializeWeeklyHours(normalizeWeeklyHours(hours)),
        "microdata",
        "certain",
      ),
    }),
  };
}

function microdataScopeScore(element: HtmlElement): number {
  return Math.max(
    0,
    ...(element.attribs.itemtype ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((value) => value.split(/[\/#]/).filter(Boolean).at(-1) ?? value)
      .map((type) => MICRODATA_TYPE_SCORES[type] ?? 0),
  );
}

function microdataAddress(scope: HtmlElement): { value: ExtractedAddress; raw: string } | null {
  const addressRoot = firstByItemProp(scope, "address");
  if (!addressRoot) return null;

  const streetAddress = elementValue(firstByItemProp(addressRoot, "streetaddress"));
  const area = elementValue(firstByItemProp(addressRoot, "addresslocality"));
  const postcode = elementValue(firstByItemProp(addressRoot, "postalcode"));
  const state = elementValue(firstByItemProp(addressRoot, "addressregion"));
  const structuredRaw = [streetAddress, area, postcode, state].filter(Boolean).join(", ");

  if (structuredRaw) {
    return {
      value: {
        ...(streetAddress && { streetAddress }),
        ...(area && { area }),
        ...(postcode && { postcode }),
        ...(state && { state }),
      },
      raw: structuredRaw,
    };
  }

  const raw = elementValue(addressRoot);
  return raw ? { value: { streetAddress: raw }, raw } : null;
}

function extractMeta(document: ReturnType<typeof parseDocument>): ExtractedIdentity {
  const values = new Map<string, string>();
  for (const meta of DomUtils.getElementsByTagName("meta", document)) {
    const key = (meta.attribs.property ?? meta.attribs.name)?.trim().toLowerCase();
    const value = meta.attribs.content?.trim();
    if (key && value && !values.has(key)) values.set(key, value);
  }

  const name = firstMapValue(values, ["business:contact_data:business_name", "og:site_name"]);
  const phone = firstMapValue(values, ["business:contact_data:phone_number", "telephone"]);
  const streetAddress = firstMapValue(values, ["business:contact_data:street_address"]);
  const area = firstMapValue(values, ["business:contact_data:locality"]);
  const postcode = firstMapValue(values, ["business:contact_data:postal_code"]);
  const state = firstMapValue(values, ["business:contact_data:region"]);
  const addressRaw = [streetAddress, area, postcode, state].filter(Boolean).join(", ");

  return {
    ...(name && { name: evidence(name, name, "meta", "likely") }),
    ...(phone && { phone: evidence(phone, phone, "meta", "certain") }),
    ...(addressRaw && {
      address: evidence(
        {
          ...(streetAddress && { streetAddress }),
          ...(area && { area }),
          ...(postcode && { postcode }),
          ...(state && { state }),
        },
        addressRaw,
        "meta",
        "certain",
      ),
    }),
  };
}

function extractVisibleFallbacks(document: ReturnType<typeof parseDocument>): ExtractedIdentity {
  const heading = DomUtils.getElementsByTagName("h1", document)
    .map((element) => cleanText(DomUtils.textContent(element)))
    .find(Boolean);
  const phoneLink = DomUtils.getElementsByTagName("a", document)
    .map((element) => element.attribs.href?.trim())
    .find((href) => href?.toLowerCase().startsWith("tel:"))
    ?.slice(4)
    .trim();
  const address = DomUtils.getElementsByTagName("address", document)
    .map((element) => cleanText(DomUtils.textContent(element)))
    .find(Boolean);

  return {
    ...(heading && { name: evidence(heading, heading, "text", "likely") }),
    ...(phoneLink && { phone: evidence(phoneLink, phoneLink, "text", "certain") }),
    ...(address && {
      address: evidence({ streetAddress: address }, address, "text", "likely"),
    }),
  };
}

function firstByItemProp(scope: HtmlElement, itemProp: string): HtmlElement | null {
  return allByItemProp(scope, itemProp)[0] ?? null;
}

function allByItemProp(scope: HtmlElement, itemProp: string): HtmlElement[] {
  return DomUtils.findAll(
    (element) =>
      (element.attribs.itemprop ?? "").toLowerCase().split(/\s+/).includes(itemProp.toLowerCase()),
    [scope],
  );
}

function elementValue(element: HtmlElement | null): string | null {
  if (!element) return null;
  const attribute =
    element.attribs.content ??
    element.attribs.value ??
    element.attribs.datetime ??
    element.attribs.href;
  return cleanText(attribute ?? DomUtils.textContent(element)) || null;
}

function firstMapValue(
  values: ReadonlyMap<string, string>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = values.get(key);
    if (value) return value;
  }
  return null;
}

function evidence<T>(
  value: T,
  raw: string,
  source: EvidenceSource,
  confidence: EvidenceConfidence,
): ExtractedValue<T> {
  return { value, raw, source, confidence };
}

function cleanText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}
