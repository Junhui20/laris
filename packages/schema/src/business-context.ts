import { z } from "zod";
import {
  GeoPoint,
  IsoDate,
  Language,
  OpeningHours,
  Photo,
  StateCode,
  Trilingual,
} from "./common.js";
import { RoomType, StayProfile } from "./verticals/stay.js";

/**
 * The Business Profile is the single source of truth. Every Channel shows a
 * projection of it. When a Channel disagrees with the Profile, the Profile is
 * right and the Channel is stale.
 *
 * Terms used here are defined in CONTEXT.md. Do not introduce a synonym.
 */

export const Vertical = z.enum(["fnb", "stay", "retail", "service"]);
export type Vertical = z.infer<typeof Vertical>;

/**
 * The four levers a Merchant Site varies on. The Merchant picks `layout` once
 * during onboarding; everything else is derived and rarely touched.
 *
 * This is deliberately tiny. The moment a merchant is adjusting spacing and
 * ordering, we have accidentally built a page builder — which is the thing we
 * are differentiating against.
 */
export const SiteTheme = z.object({
  layout: z.enum(["gallery-first", "rooms-first", "story-first"]).default("gallery-first"),
  /** Hex, derived from the hero photograph so it coordinates without taste being required. */
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1F6F63"),
  typePair: z.enum(["serif-sans", "sans-sans", "display-serif"]).default("serif-sans"),
  density: z.enum(["airy", "compact"]).default("airy"),
});
export type SiteTheme = z.infer<typeof SiteTheme>;

/**
 * Who we bill and who the brand belongs to. Holds what stays constant across
 * locations. For a single-location business this layer is invisible.
 */
export const Account = z.object({
  id: z.string().uuid(),
  brandName: z.string(),
  /** Distilled from the owner's own writing, not invented. */
  tone: z.string().optional(),
  whatsapp: z.string(),
  languages: z.array(Language).nonempty(),
  createdAt: z.string().datetime(),
});
export type Account = z.infer<typeof Account>;

/**
 * Identity and location — the NAP that must agree across every Channel.
 * Drift Check compares each Channel against exactly these fields.
 */
export const Identity = z.object({
  name: z.string(),
  addressLines: z.array(z.string()).nonempty(),
  area: z.string(),
  postcode: z.string(),
  /**
   * Fixes public holidays and the weekend group, so it is structural, not
   * decorative. A Merchant cannot span two states — see ADR-0001.
   */
  state: StateCode,
  geo: GeoPoint.optional(),
  phone: z.string(),
  whatsapp: z.string().optional(),
  /** Owned or claimed profiles elsewhere. Feeds the schema.org entity graph. */
  sameAs: z.array(z.string().url()).default([]),
  hours: z.array(OpeningHours).default([]),
});
export type Identity = z.infer<typeof Identity>;

/** A dated thing that matters. Holiday and school entries come from mycal. */
export const CalendarEntry = z.object({
  date: IsoDate,
  endDate: IsoDate.optional(),
  kind: z.enum(["public_holiday", "school_holiday", "promo", "closure", "event"]),
  name: z.union([z.string(), Trilingual]),
  /** Which states this applies to; `["*"]` for federal. Only set on mycal entries. */
  states: z.array(z.union([StateCode, z.literal("*")])).optional(),
  source: z.enum(["mycal", "merchant"]).default("merchant"),
});
export type CalendarEntry = z.infer<typeof CalendarEntry>;

/**
 * Answers compiled into FAQ schema. Keep answers to roughly 40–60 words —
 * answer engines quote short, self-contained blocks.
 */
export const FaqEntry = z.object({
  q: z.string(),
  a: z.string(),
  /** `comments` means a customer actually asked this. Those outrank invented ones. */
  source: z.enum(["comments", "merchant", "generated"]).default("merchant"),
});
export type FaqEntry = z.infer<typeof FaqEntry>;

export const WatchlistEntry = z.object({
  platform: z.enum(["tiktok", "instagram", "xiaohongshu", "facebook", "youtube"]),
  handle: z.string(),
  note: z.string().optional(),
});
export type WatchlistEntry = z.infer<typeof WatchlistEntry>;

/**
 * What the Merchant sells. The Vertical decides the shape, so this is a
 * discriminated union rather than a bag of optional fields.
 *
 * Adding a Vertical adds a member here and nothing else. It never modifies
 * the shared core and never touches another Vertical.
 */
export const Offering = z.discriminatedUnion("kind", [RoomType]);
export type Offering = z.infer<typeof Offering>;

/** Vertical-specific extensions to the Profile. */
export const VerticalProfile = z.object({
  stay: StayProfile.optional(),
});

/** One location. One Google Business Profile card. One state. */
export const Merchant = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  vertical: Vertical,
  /**
   * How the Merchant Site is addressed internally, and the key the Worker looks
   * up by. Not a hostname: `laris.my` is registered to somebody else, and a
   * Merchant is served on their own domain — which is also what goes on their
   * Google Business Profile.
   */
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words joined by hyphens"),
  /** Custom domain, once the Merchant points a CNAME at us. */
  customDomain: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Merchant = z.infer<typeof Merchant>;

/**
 * The complete truthful description of a Merchant — everything a Channel
 * projects and everything Drift Check compares against.
 */
export const BusinessContext = z.object({
  merchantId: z.string().uuid(),
  accountId: z.string().uuid(),
  vertical: Vertical,
  identity: Identity,
  verticalProfile: VerticalProfile.default({}),
  theme: SiteTheme.default({}),
  offerings: z.array(Offering).default([]),
  calendar: z.array(CalendarEntry).default([]),
  faq: z.array(FaqEntry).default([]),
  watchlist: z.array(WatchlistEntry).default([]),
  photos: z.array(Photo).default([]),
  updatedAt: z.string().datetime(),
});
export type BusinessContext = z.infer<typeof BusinessContext>;
