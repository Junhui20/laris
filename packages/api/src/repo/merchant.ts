import { BusinessContext } from "@laris/schema";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { rumahOmbak } from "../fixtures/rumah-ombak.js";

const FIXTURES: Readonly<Record<string, BusinessContext>> = {
  "rumah-ombak": rumahOmbak,
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
  const supabase = client(env);
  if (!supabase) {
    if (!opts.allowFixture) throw new Error(UNCONFIGURED);
    return FIXTURES[slug] ?? null;
  }

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

/**
 * Writes always run as the service role, which **bypasses row-level security**.
 * That is correct for a Worker rendering a Merchant Site and for onboarding,
 * and it means RLS gives a future route calling this function no Account
 * isolation at all: the argument is a slug, and a slug is not an identity.
 *
 * Caller identity and Account scoping are #8's job. Nothing in this module is
 * application-level authorisation, and it should not be read as any.
 */

/**
 * The outcome of a write, as a value rather than an exception.
 *
 * `conflict` is a normal thing to happen, not a fault: it means the Profile
 * moved between the read and the write. The caller has to show the merchant
 * what changed, so it needs to tell that apart from "no such Merchant" —
 * which a thrown error would flatten into one 500.
 */
export type WriteResult =
  | { ok: true; context: BusinessContext }
  | { ok: false; reason: "conflict" | "not-found" };

/**
 * Replaces a Merchant's Business Profile.
 *
 * Concurrency is optimistic and the token is the document's own `updatedAt`:
 * the caller passes back the value it read, and the update matches on it. Two
 * people editing the same Profile is the ordinary case once there is a
 * dashboard and a Telegram bot — last-write-wins would silently discard one of
 * them, and the thing discarded is a fact about a real business.
 *
 * There is no fixture path here on purpose. The fixture is a read-time
 * development affordance; a write with nowhere to go must fail rather than
 * appear to succeed.
 */
export async function putBusinessContext(
  env: Env,
  slug: string,
  next: BusinessContext,
  opts: { expectedUpdatedAt: string },
): Promise<WriteResult> {
  const supabase = client(env);
  if (!supabase) throw new Error(UNCONFIGURED);

  // Validate before writing, not after reading it back. The database enforces
  // that the document agrees with its row; it cannot enforce the shape.
  const context = BusinessContext.parse({ ...next, updatedAt: new Date().toISOString() });

  const { data, error } = await supabase
    .from("merchants")
    .update({ business_context: context })
    .eq("slug", slug)
    .eq("business_context->>updatedAt", opts.expectedUpdatedAt)
    .select("business_context")
    .maybeSingle();

  if (error) throw new Error(`merchant write failed: ${error.message}`);
  if (data) return { ok: true, context: BusinessContext.parse(data.business_context) };

  // Nothing updated. Either the Merchant is not there or someone else wrote
  // first, and the merchant deserves to be told which.
  const { data: existing, error: lookupError } = await supabase
    .from("merchants")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) throw new Error(`merchant write failed: ${lookupError.message}`);
  return { ok: false, reason: existing ? "conflict" : "not-found" };
}

/**
 * Creates a Merchant. Onboarding, not editing — hence the separate function
 * and the service role: `merchants_insert_own` requires an Account the caller
 * already belongs to, and at creation time nobody does.
 */
export async function insertMerchant(
  env: Env,
  slug: string,
  context: BusinessContext,
): Promise<BusinessContext> {
  const supabase = client(env);
  if (!supabase) throw new Error(UNCONFIGURED);

  const parsed = BusinessContext.parse(context);
  const { data, error } = await supabase
    .from("merchants")
    .insert({
      id: parsed.merchantId,
      account_id: parsed.accountId,
      slug,
      business_context: parsed,
    })
    .select("business_context")
    .single();

  if (error) throw new Error(`merchant insert failed: ${error.message}`);
  return BusinessContext.parse(data.business_context);
}

const UNCONFIGURED =
  "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, " +
  "or run in development where the fixture merchant is allowed.";

function client(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
