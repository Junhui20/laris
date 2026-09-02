import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The policies, exercised as a caller rather than as the database owner.
 *
 * `merchant.live.test.ts` proves the schema works; it cannot prove the security
 * model, because every client there holds `SUPABASE_SERVICE_ROLE_KEY` and the
 * service role **bypasses RLS entirely**. Those nine tests would pass with every
 * policy deleted. #3's central requirement — a merchant reads and writes its own
 * rows and nobody else's — had no evidence at all until this file.
 *
 * So: one anonymous client, and two signed-in users belonging to two different
 * Accounts. The service role appears only to set the fixtures up and tear them
 * down, which is the trusted onboarding path it is actually for.
 *
 *     env $(grep -v '^#' .env | grep '=.' | xargs) pnpm vitest run rls.live
 *
 * Needs `SUPABASE_ANON_KEY` as well as the URL and service role key. The anon
 * key is public — it ships inside every Supabase web app — and without it there
 * is no way to act as an untrusted caller.
 */

declare const process: { env: Record<string, string | undefined> };

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const configured = Boolean(url && serviceKey && anonKey);

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MERCHANT_A = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa";
const MERCHANT_B = "bbbbbbbb-1111-4bbb-8bbb-bbbbbbbbbbbb";
const SLUG_A = "rls-check-a";
const SLUG_B = "rls-check-b";
const PASSWORD = "rls-check-not-a-real-password";

const admin: SupabaseClient | null =
  configured && url && serviceKey ? createClient(url, serviceKey) : null;
const anon: SupabaseClient | null =
  configured && url && anonKey ? createClient(url, anonKey) : null;

let alice: SupabaseClient;
let bob: SupabaseClient;
const userIds: string[] = [];

function profile(merchantId: string, accountId: string) {
  return {
    merchantId,
    accountId,
    vertical: "stay",
    identity: {
      name: "RLS check",
      addressLines: ["1 Jalan Test"],
      postcode: "10000",
      state: "perak",
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
  };
}

async function signIn(email: string): Promise<SupabaseClient> {
  if (!admin || !url || !anonKey) throw new Error("not configured");
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw new Error(`could not create ${email}: ${created.error.message}`);
  const id = created.data.user?.id;
  if (!id) throw new Error(`no id for ${email}`);
  userIds.push(id);

  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`could not sign in ${email}: ${error.message}`);
  return client;
}

async function teardown() {
  if (!admin) return;
  await admin.from("merchants").delete().in("slug", [SLUG_A, SLUG_B]);
  await admin.from("account_members").delete().in("account_id", [ACCOUNT_A, ACCOUNT_B]);
  await admin.from("accounts").delete().in("id", [ACCOUNT_A, ACCOUNT_B]);
  for (const id of userIds.splice(0)) await admin.auth.admin.deleteUser(id);
}

beforeAll(async () => {
  if (!admin) return;
  await teardown();

  for (const [id, brand] of [
    [ACCOUNT_A, "Account A"],
    [ACCOUNT_B, "Account B"],
  ] as const) {
    const { error } = await admin
      .from("accounts")
      .insert({ id, brand_name: brand, whatsapp: "+60100000000", languages: ["en"] });
    if (error) throw new Error(`seeding ${brand}: ${error.message}`);
  }

  for (const [id, account, slug] of [
    [MERCHANT_A, ACCOUNT_A, SLUG_A],
    [MERCHANT_B, ACCOUNT_B, SLUG_B],
  ] as const) {
    const { error } = await admin
      .from("merchants")
      .insert({ id, account_id: account, slug, business_context: profile(id, account) });
    if (error) throw new Error(`seeding ${slug}: ${error.message}`);
  }

  alice = await signIn("rls-check-a@example.test");
  bob = await signIn("rls-check-b@example.test");

  const aliceId = userIds[0];
  const bobId = userIds[1];
  const { error } = await admin.from("account_members").insert([
    { account_id: ACCOUNT_A, user_id: aliceId },
    { account_id: ACCOUNT_B, user_id: bobId },
  ]);
  if (error) throw new Error(`seeding membership: ${error.message}`);
}, 30_000);

afterAll(teardown);

describe.skipIf(!configured)("row-level security", () => {
  describe("an anonymous caller", () => {
    for (const table of ["accounts", "account_members", "merchants"]) {
      it(`cannot read ${table}`, async () => {
        const { data, error } = await (anon as SupabaseClient).from(table).select("*");
        // Either refused outright or handed an empty set — never a row.
        expect(data ?? [], `${table}: ${error?.message ?? "no error"}`).toEqual([]);
      });
    }

    it("cannot create a Merchant", async () => {
      const { error } = await (anon as SupabaseClient).from("merchants").insert({
        id: "cccccccc-1111-4ccc-8ccc-cccccccccccc",
        account_id: ACCOUNT_A,
        slug: "rls-check-anon",
        business_context: profile("cccccccc-1111-4ccc-8ccc-cccccccccccc", ACCOUNT_A),
      });
      expect(error).not.toBeNull();
    });
  });

  describe("a signed-in member", () => {
    it("reads their own Account", async () => {
      const { data } = await alice.from("accounts").select("id, brand_name").eq("id", ACCOUNT_A);
      expect(data).toMatchObject([{ id: ACCOUNT_A }]);
    });

    it("reads their own Merchant", async () => {
      const { data } = await alice.from("merchants").select("slug").eq("slug", SLUG_A);
      expect(data).toMatchObject([{ slug: SLUG_A }]);
    });

    it("updates their own Merchant", async () => {
      const next = { ...profile(MERCHANT_A, ACCOUNT_A), updatedAt: "2026-02-02T00:00:00.000Z" };
      const { data, error } = await alice
        .from("merchants")
        .update({ business_context: next })
        .eq("slug", SLUG_A)
        .select("slug");
      expect(error?.message ?? null).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("the same member against somebody else's Account", () => {
    it("cannot see it", async () => {
      const { data } = await alice.from("accounts").select("id").eq("id", ACCOUNT_B);
      expect(data ?? []).toEqual([]);
    });

    it("cannot see its Merchant", async () => {
      const { data } = await alice.from("merchants").select("slug").eq("slug", SLUG_B);
      expect(data ?? []).toEqual([]);
    });

    it("cannot update its Merchant", async () => {
      // A policy that filters rather than errors makes this a silent no-op, so
      // the assertion is that nothing came back — and then that B still sees
      // its own row unchanged.
      const { data } = await alice
        .from("merchants")
        .update({ business_context: profile(MERCHANT_B, ACCOUNT_B) })
        .eq("slug", SLUG_B)
        .select("slug");
      expect(data ?? []).toEqual([]);

      const { data: theirs } = await bob.from("merchants").select("slug").eq("slug", SLUG_B);
      expect(theirs).toMatchObject([{ slug: SLUG_B }]);
    });

    it("cannot create a Merchant inside it", async () => {
      const id = "dddddddd-1111-4ddd-8ddd-dddddddddddd";
      const { error } = await alice.from("merchants").insert({
        id,
        account_id: ACCOUNT_B,
        slug: "rls-check-cross",
        business_context: profile(id, ACCOUNT_B),
      });
      expect(error).not.toBeNull();
    });
  });

  describe("membership", () => {
    it("is visible to the member", async () => {
      const { data } = await alice.from("account_members").select("account_id");
      expect(data).toMatchObject([{ account_id: ACCOUNT_A }]);
    });

    it("does not leak somebody else's", async () => {
      const { data } = await alice
        .from("account_members")
        .select("account_id")
        .eq("account_id", ACCOUNT_B);
      expect(data ?? []).toEqual([]);
    });
  });
});
