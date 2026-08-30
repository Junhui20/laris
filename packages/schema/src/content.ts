import { z } from "zod";
import { Language } from "./common.js";

/**
 * Content DNA and Outcome. Either one alone is decoration — DNA without
 * Outcome is a report nobody acts on, Outcome without DNA is a number with no
 * explanation. Joined, they are the only thing here that improves with age.
 */

/**
 * Bump whenever a field's meaning changes. Raw artefacts (transcript,
 * keyframes, OCR text) are retained precisely so every historical row can be
 * recomputed against a newer version instead of being discarded.
 */
export const CONTENT_DNA_SCHEMA_VERSION = 1;

export const ContentPlatform = z.enum([
  "tiktok",
  "instagram",
  "xiaohongshu",
  "facebook",
  "youtube",
  "gbp",
]);
export type ContentPlatform = z.infer<typeof ContentPlatform>;

export const HookType = z.enum(["question", "claim", "number", "conflict", "demo", "price"]);
export type HookType = z.infer<typeof HookType>;

export const CtaKind = z.enum(["whatsapp", "visit", "book", "comment", "follow", "call"]);
export type CtaKind = z.infer<typeof CtaKind>;

/**
 * Every field below is a measured quantity. If a value could not be counted,
 * timed or read off the frame, it does not belong here — an adjective an LLM
 * produced cannot be regressed against anything.
 */
export const ContentDna = z.object({
  id: z.string().uuid(),
  schemaVersion: z.number().int().default(CONTENT_DNA_SCHEMA_VERSION),

  source: z.object({
    platform: ContentPlatform,
    url: z.string().url(),
    /**
     * The single most consequential flag here. Competitor content is available
     * to anyone; our own content joined to its Outcome is the part nobody else has.
     */
    isOwn: z.boolean(),
    merchantId: z.string().uuid().optional(),
    capturedAt: z.string().datetime(),
  }),

  media: z.object({
    durationMs: z.number().int().nonnegative(),
    aspect: z.string(),
    hasFace: z.boolean().default(false),
    faceRatio: z.number().min(0).max(1).optional(),
  }),

  hook: z.object({
    type: HookType,
    firstFrameText: z.string().optional(),
    spokenAtMs: z.number().int().nonnegative().optional(),
    textVisibleAtMs: z.number().int().nonnegative().optional(),
  }),

  /** Edit rhythm. These values drive render templates directly — see docs/strategy. */
  pacing: z.object({
    cuts: z.number().int().nonnegative(),
    cutsPer10s: z.number().nonnegative(),
    avgShotMs: z.number().int().nonnegative(),
    silenceRatio: z.number().min(0).max(1),
  }),

  transcript: z.object({
    /** Code-switching is the norm here, so this is a set, never one value. */
    langMix: z.array(Language),
    words: z.number().int().nonnegative(),
    wpm: z.number().nonnegative(),
    text: z.string(),
  }),

  textOnScreen: z
    .array(
      z.object({
        atMs: z.number().int().nonnegative(),
        text: z.string(),
        areaPct: z.number().min(0).max(1).optional(),
      }),
    )
    .default([]),

  cta: z.object({
    present: z.boolean(),
    kind: CtaKind.optional(),
    atMs: z.number().int().nonnegative().optional(),
    /** Where in the runtime it lands, 0–1. Late CTAs behave differently to early ones. */
    positionPct: z.number().min(0).max(1).optional(),
  }),

  topic: z.object({
    tags: z.array(z.string()).default([]),
    festival: z.string().optional(),
  }),

  comments: z
    .object({
      n: z.number().int().nonnegative(),
      sentiment: z.number().min(-1).max(1).optional(),
      /** Real customer questions. These become FAQ entries, which beat invented ones. */
      topQuestions: z.array(z.string()).default([]),
    })
    .optional(),

  model: z.object({
    vlm: z.string(),
    confidence: z.number().min(0).max(1).optional(),
  }),
});
export type ContentDna = z.infer<typeof ContentDna>;

/**
 * Contacts are dense, automatic and same-day; Bookings are sparse,
 * merchant-reported and real money. They are counted separately because they
 * are different things — see ADR-0002. Never collapse them into "leads".
 */
export const Contacts = z.object({
  whatsappTaps: z.number().int().nonnegative().default(0),
  callTaps: z.number().int().nonnegative().default(0),
  directionsTaps: z.number().int().nonnegative().default(0),
  /** `stay`: someone checked dates. Other verticals may leave this at zero. */
  availabilityChecks: z.number().int().nonnegative().default(0),
});
export type Contacts = z.infer<typeof Contacts>;

export const ContentOutcome = z.object({
  contentDnaId: z.string().uuid(),
  collectedAt: z.string().datetime(),
  /** 24 / 72 / 168 — one row each, so the decay curve is visible. */
  windowH: z.union([z.literal(24), z.literal(72), z.literal(168)]),

  views: z.number().int().nonnegative().default(0),
  watchThroughRate: z.number().min(0).max(1).optional(),
  avgWatchMs: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
  saves: z.number().int().nonnegative().default(0),
  profileVisits: z.number().int().nonnegative().default(0),

  contacts: Contacts.default({}),

  /**
   * Reported by the Merchant, never inferred. Absent means "not yet reported",
   * which is not the same as zero — treat the distinction as real.
   */
  bookings: z.number().int().nonnegative().optional(),
});
export type ContentOutcome = z.infer<typeof ContentOutcome>;

/** Total observed interest. The dependent variable for anything statistical. */
export function totalContacts(c: Contacts): number {
  return c.whatsappTaps + c.callTaps + c.directionsTaps + c.availabilityChecks;
}
