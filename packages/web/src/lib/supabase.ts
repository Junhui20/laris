import { createClient } from "@supabase/supabase-js";

/**
 * The dashboard talks to Supabase directly, as the signed-in merchant.
 *
 * Not through the Worker. The Worker holds the service role, which bypasses
 * row-level security — routing edits through it would mean writing the
 * Account-scoping rules a second time, in application code, and getting them
 * right there too. Going straight to Supabase with the user's own token means
 * the policies are the authorisation, and those are tested against real callers
 * in `packages/api/src/repo/rls.live.test.ts`.
 *
 * The anon key is public by design: it ships inside every Supabase web app and
 * grants nothing on its own. What a caller may see is decided by the policies
 * and by whose token they are holding.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && anonKey);

export const supabase = configured
  ? createClient(url as string, anonKey as string)
  : (null as never);
