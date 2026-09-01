import { z } from "zod";

/**
 * Money is always integer cents. Any float touching money is a bug.
 * Ecosystem-wide rule, not local to Laris.
 */
export const Cents = z.number().int();

/** ISO 8601 date, no time component: "2026-09-16". */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** "15:00" — 24-hour local time. */
export const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

/**
 * The languages Laris generates copy in. A merchant serving all three is the
 * normal case in Malaysia, not an edge case.
 */
export const Language = z.enum(["ms", "en", "zh"]);
export type Language = z.infer<typeof Language>;

/** A string carrying its Malay / English / Chinese variants. */
export const Trilingual = z.object({
  ms: z.string(),
  en: z.string(),
  zh: z.string().optional(),
});
export type Trilingual = z.infer<typeof Trilingual>;

/**
 * Canonical Malaysian state codes. Public holidays and the weekend itself vary
 * by state, so this is never free text. Alias resolution ("KL", "jb") is mycal's job.
 */
export const StateCode = z.enum([
  "johor",
  "kedah",
  "kelantan",
  "melaka",
  "negeri-sembilan",
  "pahang",
  "perak",
  "perlis",
  "pulau-pinang",
  "sabah",
  "sarawak",
  "selangor",
  "terengganu",
  "kuala-lumpur",
  "labuan",
  "putrajaya",
]);
export type StateCode = z.infer<typeof StateCode>;

/**
 * Weekend grouping, from mycal.
 * A = Kedah / Kelantan / Terengganu — weekend is Friday–Saturday.
 * B = everywhere else — Saturday–Sunday.
 * Scheduling and weekend pricing both key off this. Assuming B is a KL bug.
 */
export const WeekendGroup = z.enum(["A", "B"]);
export type WeekendGroup = z.infer<typeof WeekendGroup>;

/** 0 = Sunday … 6 = Saturday. */
export const Weekday = z.number().int().min(0).max(6);

export const OpeningHours = z.object({
  weekday: Weekday,
  opens: LocalTime,
  closes: LocalTime,
  /** A mamak shutting at 02:00 closes on the following day. */
  closesNextDay: z.boolean().default(false),
});
export type OpeningHours = z.infer<typeof OpeningHours>;

export const Photo = z.object({
  /**
   * An absolute URL, or a root-relative path served from the site's own
   * origin. Merchant photos belong on a CDN eventually, but a Merchant Site is
   * rendered on the same origin the photos are served from, so "/m/<slug>/x.jpg"
   * is the honest form until they move — and it does not bake a hostname into
   * the Business Profile, which would then be wrong in every other Channel.
   */
  url: z.union([z.string().url(), z.string().regex(/^\/[^/]/, "expected a URL or a /path")]),
  alt: z.string().optional(),
});
export type Photo = z.infer<typeof Photo>;

export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;
