import { BusinessContext } from "@laris/schema";
import { supabase } from "./supabase.js";

/**
 * Reading and writing a Business Profile as the signed-in merchant.
 *
 * The write is optimistic and the token is the document's own `updatedAt`: the
 * value that was read comes back with the save and the update matches on it.
 * Two people editing the same Profile is ordinary once there is a dashboard and
 * a bot, and last-write-wins would silently discard one of them — the thing
 * discarded being a fact about a real business.
 */

export type MerchantRow = {
  slug: string;
  business_context: BusinessContext;
};

export async function listMerchants(): Promise<MerchantRow[]> {
  // No filter by account: row-level security already limits this to the
  // Accounts the signed-in user belongs to. Adding a `.eq()` here would be a
  // second, weaker copy of a rule the database already enforces.
  const { data, error } = await supabase
    .from("merchants")
    .select("slug, business_context")
    .order("slug");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    business_context: BusinessContext.parse(row.business_context),
  }));
}

export type SaveResult =
  | { ok: true; profile: BusinessContext }
  | { ok: false; reason: "conflict"; theirs: BusinessContext }
  | { ok: false; reason: "denied"; message: string };

export async function saveProfile(
  slug: string,
  next: BusinessContext,
  expectedUpdatedAt: string,
): Promise<SaveResult> {
  const profile = BusinessContext.parse({ ...next, updatedAt: new Date().toISOString() });

  const { data, error } = await supabase
    .from("merchants")
    .update({ business_context: profile })
    .eq("slug", slug)
    .eq("business_context->>updatedAt", expectedUpdatedAt)
    .select("business_context")
    .maybeSingle();

  if (error) return { ok: false, reason: "denied", message: error.message };
  if (data) return { ok: true, profile: BusinessContext.parse(data.business_context) };

  // Nothing matched. Either somebody else saved first, or a policy refused the
  // row — and those need different words, so ask which.
  const { data: current } = await supabase
    .from("merchants")
    .select("business_context")
    .eq("slug", slug)
    .maybeSingle();

  if (current) {
    return {
      ok: false,
      reason: "conflict",
      theirs: BusinessContext.parse(current.business_context),
    };
  }
  return {
    ok: false,
    reason: "denied",
    message: "This merchant is not yours to edit, or it no longer exists.",
  };
}
