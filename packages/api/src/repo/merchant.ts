import { BusinessContext } from "@laris/schema";
import { createClient } from "@supabase/supabase-js";
import { pangkorMyHomestay } from "../fixtures/pangkor-my-homestay.js";
import { rumahOmbak } from "../fixtures/rumah-ombak.js";

const FIXTURES: Readonly<Record<string, BusinessContext>> = {
  "rumah-ombak": rumahOmbak,
  "pangkor-my-homestay": pangkorMyHomestay,
};

export type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

/**
 * Reads a Business Context by Merchant slug.
 *
 * With Supabase unconfigured this falls back to the built-in fixture, so a
 * fresh clone runs and renders a finished site with no credentials. That is a
 * deliberate development affordance, not a production path — a misconfigured
 * deployment must fail loudly rather than silently serve someone else's
 * homestay, so the fallback is refused unless `allowFixture` is set.
 */
export async function getBusinessContext(
  env: Env,
  slug: string,
  opts: { allowFixture: boolean },
): Promise<BusinessContext | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!opts.allowFixture) {
      throw new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, " +
          "or run in development where the fixture merchant is allowed.",
      );
    }
    return FIXTURES[slug] ?? null;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("merchants")
    .select("business_context")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`merchant lookup failed: ${error.message}`);
  if (!data) return null;

  // Parse rather than cast. A row that drifted from the schema should surface
  // here, at the boundary, not as a missing field somewhere inside a template.
  return BusinessContext.parse(data.business_context);
}
