import type { Env } from "./repo/merchant.js";

/** Everything the Worker reads off `c.env`, in one place so every route agrees. */
export type Bindings = Env & {
  ENVIRONMENT?: string;
  ALLOW_FIXTURE?: string;
  API_TOKEN?: string;
};

/**
 * Development is declared, never inferred, and it is the value that has to be
 * spelled correctly — not the safe one.
 *
 * This was `!env.SUPABASE_URL`, which made every database-less deployment look
 * like a laptop. Replacing it with `!== "production"` fixed that case and kept
 * the shape of the bug: an absent binding, a typo, or any value someone adds
 * later still read as development, so a Worker whose `ENVIRONMENT` was
 * misspelled would serve the fixture and expose `/v1/*`. Only the exact string
 * `"development"` opens anything; everything else, including nothing at all,
 * is production.
 */
export const isDev = (env: Bindings) => env.ENVIRONMENT === "development";

/**
 * Whether the built-in fixture Merchant may be served. Deliberate in
 * production: one real merchant, hand-maintained, until #3 lands.
 *
 * This lives here rather than in `index.tsx` because it was private there while
 * `drift/route.ts` decided the same question with its own `!env.SUPABASE_URL`.
 * Two gates in front of one fixture means the strict one can be walked around,
 * and merging #7 into this branch created exactly that: the fixture reached
 * `/v1/merchants/:slug/drift-check` without ever consulting `ENVIRONMENT`.
 */
export const allowFixture = (env: Bindings) => isDev(env) || env.ALLOW_FIXTURE === "true";
