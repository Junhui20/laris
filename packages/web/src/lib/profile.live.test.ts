import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listMerchants, saveProfile } from "./profile.js";
import { supabase } from "./supabase.js";

/**
 * The dashboard's data layer, exercised as a real signed-in merchant.
 *
 * It matters that this runs through the same `supabase` client the app uses and
 * the same two functions the forms call — not through a service-role client,
 * which bypasses row-level security and would pass with every policy missing.
 * The whole reason the dashboard talks to Supabase directly is that the
 * policies are the authorisation; that is only true if somebody checks.
 *
 *     env $(grep -v '^#' ../../.env | grep '=.' | xargs) \
 *       VITE_SUPABASE_URL=$SUPABASE_URL VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
 *       pnpm --filter @laris/web exec vitest run profile.live
 */
declare const process: { env: Record<string, string | undefined> };

const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && serviceKey && import.meta.env.VITE_SUPABASE_ANON_KEY);

const ACCOUNT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const MERCHANT = "eeeeeeee-1111-4eee-8eee-eeeeeeeeeeee";
const OTHER_ACCOUNT = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const OTHER_MERCHANT = "ffffffff-1111-4fff-8fff-ffffffffffff";
const SLUG = "dash-check";
const OTHER_SLUG = "dash-check-other";
const EMAIL = "dash-check@example.test";
const PASSWORD = "dash-check-not-a-real-password";

const admin = configured ? createClient(url as string, serviceKey as string) : null;
let userId: string | null = null;

const profileFor = (merchantId: string, accountId: string, name: string) => ({
  merchantId,
  accountId,
  vertical: "stay" as const,
  identity: {
    name,
    addressLines: ["1 Jalan Test"],
    area: "Test Area",
    postcode: "10000",
    state: "perak" as const,
    phone: "+60100000000",
    sameAs: [],
    hours: [],
  },
  verticalProfile: {},
  theme: {},
  offerings: [],
  calendar: [],
  faq: [],
  watchlist: [],
  photos: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
});

async function teardown() {
  if (!admin) return;
  await admin.from("merchants").delete().in("slug", [SLUG, OTHER_SLUG]);
  await admin.from("account_members").delete().in("account_id", [ACCOUNT, OTHER_ACCOUNT]);
  await admin.from("accounts").delete().in("id", [ACCOUNT, OTHER_ACCOUNT]);
  if (userId) await admin.auth.admin.deleteUser(userId);
  userId = null;
}

beforeAll(async () => {
  if (!admin) return;
  await teardown();

  await admin.from("accounts").insert([
    { id: ACCOUNT, brand_name: "Dash", whatsapp: "+60100000000", languages: ["en"] },
    { id: OTHER_ACCOUNT, brand_name: "Other", whatsapp: "+60100000000", languages: ["en"] },
  ]);
  await admin.from("merchants").insert([
    {
      id: MERCHANT,
      account_id: ACCOUNT,
      slug: SLUG,
      business_context: profileFor(MERCHANT, ACCOUNT, "Mine"),
    },
    {
      id: OTHER_MERCHANT,
      account_id: OTHER_ACCOUNT,
      slug: OTHER_SLUG,
      business_context: profileFor(OTHER_MERCHANT, OTHER_ACCOUNT, "Theirs"),
    },
  ]);

  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  userId = created.data.user?.id ?? null;
  await admin.from("account_members").insert({ account_id: ACCOUNT, user_id: userId });

  const { error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
}, 30_000);

afterAll(async () => {
  if (configured) await supabase.auth.signOut();
  await teardown();
});

describe.skipIf(!configured)("the dashboard as a signed-in merchant", () => {
  it("lists only the businesses that are theirs", async () => {
    const rows = await listMerchants();
    // No filter is applied in `listMerchants` — this is the policy doing it.
    expect(rows.map((r) => r.slug)).toEqual([SLUG]);
  });

  it("saves a change and hands back the new token", async () => {
    const [row] = await listMerchants();
    if (!row) throw new Error("nothing to edit");

    const result = await saveProfile(
      SLUG,
      {
        ...row.business_context,
        identity: { ...row.business_context.identity, phone: "+60111111111" },
      },
      row.business_context.updatedAt,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.identity.phone).toBe("+60111111111");
      expect(result.profile.updatedAt).not.toBe(row.business_context.updatedAt);
    }
  });

  it("reports a conflict instead of overwriting somebody else's save", async () => {
    const [row] = await listMerchants();
    if (!row) throw new Error("nothing to edit");

    const result = await saveProfile(SLUG, row.business_context, "2020-01-01T00:00:00.000Z");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
      // And it hands back what is actually live, so the form can say so.
      if (result.reason === "conflict") expect(result.theirs.identity.name).toBe("Mine");
    }
  });

  it("cannot edit a business belonging to another Account", async () => {
    const result = await saveProfile(
      OTHER_SLUG,
      profileFor(OTHER_MERCHANT, OTHER_ACCOUNT, "Hijacked") as never,
      "2026-01-01T00:00:00.000Z",
    );
    expect(result.ok).toBe(false);
    // The row is invisible to this caller, so the honest answer is "not yours",
    // not "somebody saved first".
    if (!result.ok) expect(result.reason).toBe("denied");

    const { data } = await (admin as NonNullable<typeof admin>)
      .from("merchants")
      .select("business_context")
      .eq("slug", OTHER_SLUG)
      .single();
    expect((data?.business_context as { identity: { name: string } }).identity.name).toBe("Theirs");
  });
});
