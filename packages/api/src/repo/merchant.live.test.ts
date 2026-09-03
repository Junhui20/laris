import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rumahOmbak } from "../fixtures/rumah-ombak.js";
import { getBusinessContext, insertMerchant, putBusinessContext } from "./merchant.js";

/**
 * Runs against a real Supabase project, and skips itself without one.
 *
 * The unit tests stub the transport, so they prove the repo asks the right
 * questions but not that the database answers them — the generated columns,
 * the CHECK constraints and the concurrency filter all live in SQL that no
 * amount of mocking exercises. And migrations are only reviewable if the other
 * maintainer can run them against their own project:
 *
 *     env $(grep -v '^#' .env | grep '=.' | xargs) pnpm vitest run merchant.live
 *
 * It creates and deletes its own rows and touches nothing else.
 */

// The API package compiles for Workers, which has no `process`. The test runs
// under Node, so this declares what is there rather than pulling node types
// into the deployed build.
declare const process: { env: Record<string, string | undefined> };

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const SLUG = "live-check-rumah-ombak";
const admin: SupabaseClient | null =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

function db(): SupabaseClient {
  if (!admin) throw new Error("live tests ran without Supabase configured");
  return admin;
}

const cleanup = async () => {
  if (!admin) return;
  await admin.from("merchants").delete().eq("slug", SLUG);
  await admin.from("accounts").delete().eq("id", rumahOmbak.accountId);
};

beforeAll(cleanup);
afterAll(cleanup);

describe.skipIf(!admin)("live database", () => {
  it("has the three tables", async () => {
    for (const table of ["accounts", "account_members", "merchants"]) {
      const { error } = await db().from(table).select("*").limit(1);
      expect(error?.message ?? null, table).toBeNull();
    }
  });

  it("round-trips a Business Profile", async () => {
    const { error } = await db()
      .from("accounts")
      .insert({
        id: rumahOmbak.accountId,
        brand_name: "Rumah Ombak",
        whatsapp: "+60123456789",
        languages: ["en", "ms"],
      });
    expect(error?.message ?? null).toBeNull();

    await insertMerchant(env, SLUG, rumahOmbak);
    const read = await getBusinessContext(env, SLUG, { allowFixture: false });
    expect(read?.identity.name).toBe(rumahOmbak.identity.name);
  });

  it("generates vertical and state from the document rather than storing them twice", async () => {
    const { data } = await db()
      .from("merchants")
      .select("vertical, state")
      .eq("slug", SLUG)
      .single();
    expect(data).toEqual({ vertical: "stay", state: "pulau-pinang" });
  });

  it("refuses a document whose ids disagree with its row", async () => {
    const { error } = await db()
      .from("merchants")
      .insert({
        id: "99999999-9999-4999-8999-999999999999",
        account_id: rumahOmbak.accountId,
        slug: `${SLUG}-bad-id`,
        business_context: rumahOmbak,
      });
    expect(error?.message).toMatch(/merchants_context_id_agrees/);
  });

  it("refuses a state that is not a Malaysian one", async () => {
    const bogus = {
      ...rumahOmbak,
      merchantId: "88888888-8888-4888-8888-888888888888",
      identity: { ...rumahOmbak.identity, state: "singapore" },
    };
    const { error } = await db()
      .from("merchants")
      .insert({
        id: bogus.merchantId,
        account_id: bogus.accountId,
        slug: `${SLUG}-bad-state`,
        business_context: bogus,
      });
    expect(error?.message).toMatch(/merchants_state_known/);
  });

  it("accepts a write carrying the updatedAt it read", async () => {
    const current = await getBusinessContext(env, SLUG, { allowFixture: false });
    if (!current) throw new Error("missing merchant");

    const result = await putBusinessContext(
      env,
      SLUG,
      { ...current, identity: { ...current.identity, phone: "+60127654321" } },
      { expectedUpdatedAt: current.updatedAt },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.identity.phone).toBe("+60127654321");
  });

  it("rejects a second editor holding a stale updatedAt", async () => {
    expect(
      await putBusinessContext(env, SLUG, rumahOmbak, {
        expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "conflict" });
  });

  it("tells not-found apart from conflict", async () => {
    expect(
      await putBusinessContext(env, "no-such-merchant", rumahOmbak, {
        expectedUpdatedAt: rumahOmbak.updatedAt,
      }),
    ).toEqual({ ok: false, reason: "not-found" });
  });

  it("refuses a document whose accountId disagrees with its row", async () => {
    // The sibling constraint to the merchantId one. The PR claimed both were
    // covered; only one was.
    const bogus = {
      ...rumahOmbak,
      accountId: "77777777-7777-4777-8777-777777777777",
    };
    const { error } = await db()
      .from("merchants")
      .insert({
        id: "66666666-6666-4666-8666-666666666666",
        account_id: rumahOmbak.accountId,
        slug: `${SLUG}-bad-account`,
        business_context: bogus,
      });
    expect(error?.message).toMatch(/merchants_context_account_agrees/);
  });

  it("returns the document token the next write has to send back", async () => {
    // The concurrency token is the document's own `updatedAt`, not the row's
    // `updated_at`. This asserts the value a caller reads is the value that
    // works — the earlier version of this test watched the row clock move,
    // which is audit metadata and would have passed with the token broken.
    const current = await getBusinessContext(env, SLUG, { allowFixture: false });
    if (!current) throw new Error("missing merchant");

    const stale = await putBusinessContext(env, SLUG, current, {
      expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(stale).toEqual({ ok: false, reason: "conflict" });

    const fresh = await putBusinessContext(env, SLUG, current, {
      expectedUpdatedAt: current.updatedAt,
    });
    expect(fresh.ok).toBe(true);
  });

  for (const [what, languages] of [
    ["an empty language list", []],
    ["a language the schema does not have", ["en", "klingon"]],
  ] as const) {
    it(`refuses an Account with ${what}`, async () => {
      // `Account.languages` is a non-empty array of ms | en | zh. The column
      // used to permit anything and default to empty, so a row the database
      // called valid could be impossible to parse as the shape the schema is
      // supposed to be the source of truth for.
      const { error } = await db().from("accounts").insert({
        id: "55555555-5555-4555-8555-555555555555",
        brand_name: "language check",
        whatsapp: "+60100000000",
        languages,
      });
      expect(error?.message).toMatch(/accounts_languages_known/);
    });
  }

  it("accepts an Account whose languages the schema recognises", async () => {
    const id = "44444444-4444-4444-8444-444444444444";
    await db().from("accounts").delete().eq("id", id);
    const { error } = await db()
      .from("accounts")
      .insert({
        id,
        brand_name: "language check",
        whatsapp: "+60100000000",
        languages: ["ms", "en", "zh"],
      });
    expect(error?.message ?? null).toBeNull();
    await db().from("accounts").delete().eq("id", id);
  });

  it("keeps the row clock as audit metadata", async () => {
    const { data } = await db()
      .from("merchants")
      .select("created_at, updated_at")
      .eq("slug", SLUG)
      .single();
    if (!data) throw new Error("missing merchant row");
    expect(Date.parse(data.updated_at)).toBeGreaterThan(Date.parse(data.created_at));
  });
});
