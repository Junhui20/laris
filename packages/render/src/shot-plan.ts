import { z } from "zod";

/**
 * What a composition renders.
 *
 * The plan is data, not code: nothing in a composition reads a Business
 * Profile, samples a photograph or decides what to say. That work happens once,
 * up front, and lands here — which is the same split phase 01 and phase 02 have
 * to hold anyway. Perception produces a plan; the renderer draws it.
 *
 * It also makes the interesting decisions reviewable. A wrong panel colour or a
 * mis-ordered shot is a line in a JSON file, not something you find by watching
 * twenty seconds of video.
 */

export const Layout = z.enum([
  /** A 3:4 photograph fills the 9:16 frame. Type sits on a gradient. */
  "full-bleed",
  /** Anything wider is cropped square and takes the top; type sits on a panel. */
  "panel",
]);
export type Layout = z.infer<typeof Layout>;

export const Shot = z.object({
  photo: z.string(),
  /** Which part of the listing this fact belongs to — the Site's own grouping. */
  eyebrow: z.string(),
  headline: z.string(),
  sub: z.string(),
  /** Set on the closing shot only. Renders as a pill. */
  tag: z.string().optional(),
  durationMs: z.number().int().positive(),
  layout: Layout,
  /**
   * Sampled from the photograph itself — its most saturated colour, taken down
   * to a tone white type sits on. Averaging gives mud: every room in this house
   * averages to grey floor tile.
   */
  panelColor: z.string().regex(/^#[0-9a-f]{6}$/),
});
export type Shot = z.infer<typeof Shot>;

export const ShotPlan = z.object({
  merchantSlug: z.string(),
  /** Rendered under the rule on every frame. Listing videos get screenshotted. */
  footer: z.string(),
  shots: z.array(Shot).nonempty(),
});
export type ShotPlan = z.infer<typeof ShotPlan>;
