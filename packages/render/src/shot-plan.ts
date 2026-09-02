import { z } from "zod";

/**
 * What a composition renders.
 *
 * The plan is data, not code: nothing in a composition reads a Business
 * Profile, samples a photograph or decides what to say. That work happens once,
 * up front, and lands here — the same split phase 01 and phase 02 have to hold
 * anyway. Perception produces a plan; the renderer draws it.
 *
 * A **Scene** is one line of narration. Its length comes from the audio file,
 * not from a number someone picked, and its photographs share that length. The
 * picture cutting faster than the voice is what a cut made this decade sounds
 * like; one photograph per sentence is what a slideshow looks like.
 */

export const Motion = z.enum([
  /** Slow horizontal travel. What lets a landscape photograph live in 9:16. */
  "pan-x",
  /** Slow vertical travel, for a tall photograph in a wide frame. */
  "pan-y",
  /** Settle out of a slight over-scale. Used on the opening frame. */
  "punch",
]);
export type Motion = z.infer<typeof Motion>;

export const Frame = z.object({
  photo: z.string(),
  motion: Motion,
  /** Travel direction, so two consecutive frames do not drift the same way. */
  reverse: z.boolean().default(false),
});
export type Frame = z.infer<typeof Frame>;

export const Scene = z.object({
  /** One narration line. Absent means the scene is silent and self-timed. */
  audio: z.string().optional(),
  durationMs: z.number().int().positive(),
  /** What the voice says. Kept so the plan is readable without playing it. */
  spoken: z.string(),
  /** What the screen says — shorter than the line, never a transcript of it. */
  headline: z.string(),
  sub: z.string().optional(),
  /** Set on the closing scene. Renders as a pill. */
  tag: z.string().optional(),
  frames: z.array(Frame).nonempty(),
  /**
   * Sampled from the first photograph: its most saturated colour, taken down to
   * a tone white type sits on. Averaging gives mud — every room in this house
   * averages to grey floor tile.
   */
  color: z.string().regex(/^#[0-9a-f]{6}$/),
});
export type Scene = z.infer<typeof Scene>;

export const ShotPlan = z.object({
  merchantSlug: z.string(),
  contact: z.string(),
  scenes: z.array(Scene).nonempty(),
});
export type ShotPlan = z.infer<typeof ShotPlan>;
