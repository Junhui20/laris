import type { BusinessContext } from "@laris/schema";
import { amenityEn, stateOfficial } from "./labels.js";

/**
 * Structured data for a Merchant Site.
 *
 * This is what Answer Presence is built from: pages carrying correct schema
 * are markedly more likely to be quoted by answer engines, and FAQ markup
 * more so again. Two rules follow from that and neither is negotiable:
 *
 * 1. Every value here is read from the Business Profile. Nothing is written by
 *    hand into a template, because the moment an address is hardcoded the
 *    promise that changing it once fixes everywhere is broken.
 * 2. Identity fields must match the Profile exactly, character for character.
 *    Drift Check compares other Channels against these same fields, so a
 *    "tidied up" address here would make every comparison report a false
 *    mismatch.
 */

const MYR = "MYR";

function ringgit(cents: number): string {
  return (cents / 100).toFixed(0);
}

export function lodgingBusinessJsonLd(ctx: BusinessContext, siteUrl: string) {
  const { identity } = ctx;
  const rooms = ctx.offerings.filter((o) => o.kind === "room_type");
  // A site that does not publish rates does not assert one to Google either.
  const rates = ctx.theme.showRates ? rooms.map((r) => r.baseRateCents) : [];

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: identity.name,
    url: siteUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: identity.addressLines.join(", "),
      addressLocality: identity.area,
      postalCode: identity.postcode,
      addressRegion: stateOfficial(identity.state),
      addressCountry: "MY",
    },
    ...(identity.geo && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: identity.geo.lat,
        longitude: identity.geo.lng,
      },
    }),
    telephone: identity.phone,
    ...(identity.sameAs.length > 0 && { sameAs: identity.sameAs }),
    ...(rates.length > 0 && {
      priceRange: `RM${ringgit(Math.min(...rates))}–RM${ringgit(Math.max(...rates))}`,
    }),
    makesOffer: rooms.map((r) => ({
      "@type": "Offer",
      name: r.name,
      ...(ctx.theme.showRates && { price: ringgit(r.baseRateCents), priceCurrency: MYR }),
      ...(r.description && { description: r.description }),
    })),
    amenityFeature: amenityUnion(ctx).map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };
}

/**
 * FAQ markup. Answers stay short on purpose — answer engines quote
 * self-contained blocks, and a long answer gets truncated or skipped.
 */
export function faqPageJsonLd(ctx: BusinessContext) {
  if (ctx.faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ctx.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function amenityUnion(ctx: BusinessContext): string[] {
  const seen = new Set<string>();
  for (const o of ctx.offerings) {
    if (o.kind !== "room_type") continue;
    for (const a of o.amenities) seen.add(amenityEn(a));
  }
  return [...seen];
}
