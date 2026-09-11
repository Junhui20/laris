import { z } from "zod";

/** A Business Profile identity field that a Channel can contradict. */
export const DriftField = z.enum(["name", "phone", "address", "hours"]);
export type DriftField = z.infer<typeof DriftField>;

export const DriftConfidence = z.enum(["certain", "likely"]);
export type DriftConfidence = z.infer<typeof DriftConfidence>;

export const DriftSource = z.enum(["json-ld", "microdata", "meta", "text"]);
export type DriftSource = z.infer<typeof DriftSource>;

/**
 * One reliable disagreement between a Channel and the Business Profile.
 *
 * V1 emits only `certain`. `likely` is representable for a later review UI;
 * uncertain evidence stays silent until a human-facing workflow exists.
 */
export const Mismatch = z.object({
  field: DriftField,
  profileValue: z.string(),
  channelValue: z.string(),
  confidence: DriftConfidence,
  source: DriftSource,
});
export type Mismatch = z.infer<typeof Mismatch>;
