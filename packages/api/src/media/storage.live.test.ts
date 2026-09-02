import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The Storage policies, exercised as callers rather than as the bucket owner.
 *
 * A private bucket is not the same as an authorised one: an anonymous list
 * against it answers `200` with an empty array, exactly as a filtered table
 * select does, so "it returned 200" proves nothing either way. What has to be
 * checked is that a member can write under their own Merchant's prefix, that
 * the same member cannot write under somebody else's, and that anonymous can do
 * neither — with the service role shown seeing the object, so an empty result
 * is a fact about the policy rather than about an empty bucket.
 *
 *     env $(grep -v '^#' .env | grep '=.' | xargs) pnpm vitest run storage.live
 */
declare const process: { env: Record<string, string | undefined> };

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const configured = Boolean(url && serviceKey && anonKey);

const BUCKET = "merchant-media";
// A namespace of its own. These files run in parallel, and an earlier
// version shared UUIDs with `rls.live.test.ts` — each teardown deleted the
// other's fixtures, so both passed alone and failed together.
const MINE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const THEIRS = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MY_SLUG = "media-check-mine";
const THEIR_SLUG = "media-check-theirs";
const EMAIL = "media-check@example.test";
const PASSWORD = "media-check-not-a-real-password";

const admin: SupabaseClient | null = configured ? createClient(url!, serviceKey!) : null;
const anon: SupabaseClient | null = configured ? createClient(url!, anonKey!) : null;
let member: SupabaseClient;
let userId: string | null = null;

const bytes = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
const profile = (merchantId: string, accountId: string) => ({
  merchantId,
  accountId,
  vertical: "stay",
  identity: {
    name: "media check",
    addressLines: ["1 Jalan Test"],
    area: "Test Area",
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
});

async function teardown() {
  if (!admin) return;
  await admin.storage
    .from(BUCKET)
    .remove([`${MY_SLUG}/probe-480.jpg`, `${THEIR_SLUG}/probe-480.jpg`]);
  await admin.from("merchants").delete().in("slug", [MY_SLUG, THEIR_SLUG]);
  await admin.from("account_members").delete().in("account_id", [MINE, THEIRS]);
  await admin.from("accounts").delete().in("id", [MINE, THEIRS]);
  if (userId) await admin.auth.admin.deleteUser(userId);
  userId = null;
}

beforeAll(async () => {
  if (!admin) return;
  await teardown();
  await admin.from("accounts").insert([
    { id: MINE, brand_name: "Mine", whatsapp: "+60100000000", languages: ["en"] },
    { id: THEIRS, brand_name: "Theirs", whatsapp: "+60100000000", languages: ["en"] },
  ]);
  await admin.from("merchants").insert([
    {
      id: "cccccccc-1111-4ccc-8ccc-cccccccccccc",
      account_id: MINE,
      slug: MY_SLUG,
      business_context: profile("cccccccc-1111-4ccc-8ccc-cccccccccccc", MINE),
    },
    {
      id: "dddddddd-1111-4ddd-8ddd-dddddddddddd",
      account_id: THEIRS,
      slug: THEIR_SLUG,
      business_context: profile("dddddddd-1111-4ddd-8ddd-dddddddddddd", THEIRS),
    },
  ]);

  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  userId = created.data.user?.id ?? null;
  await admin.from("account_members").insert({ account_id: MINE, user_id: userId });

  member = createClient(url!, anonKey!);
  const { error } = await member.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
}, 30_000);

afterAll(async () => {
  if (configured) await member?.auth.signOut();
  await teardown();
});

describe.skipIf(!configured)("merchant media storage", () => {
  it("lets a member upload under their own Merchant", async () => {
    const { error } = await member.storage
      .from(BUCKET)
      .upload(`${MY_SLUG}/probe-480.jpg`, bytes(), { contentType: "image/jpeg", upsert: true });
    expect(error?.message ?? null).toBeNull();
  });

  it("refuses the same member under another Account's Merchant", async () => {
    const { error } = await member.storage
      .from(BUCKET)
      .upload(`${THEIR_SLUG}/probe-480.jpg`, bytes(), { contentType: "image/jpeg", upsert: true });
    expect(error).not.toBeNull();
  });

  it("refuses a path that belongs to no Merchant at all", async () => {
    const { error } = await member.storage
      .from(BUCKET)
      .upload("no-such-merchant/probe-480.jpg", bytes(), { contentType: "image/jpeg" });
    expect(error).not.toBeNull();
  });

  it("gives an anonymous caller nothing, while the service role sees the object", async () => {
    // Both halves matter. A private bucket answers an anonymous list with 200
    // and an empty array, so "empty" is only evidence next to a caller that
    // does see something.
    const asAnon = await (anon as SupabaseClient).storage.from(BUCKET).list(MY_SLUG);
    expect((asAnon.data ?? []).length).toBe(0);

    const asAdmin = await (admin as SupabaseClient).storage.from(BUCKET).list(MY_SLUG);
    expect((asAdmin.data ?? []).map((f) => f.name)).toContain("probe-480.jpg");
  });

  it("refuses an anonymous upload", async () => {
    const { error } = await (anon as SupabaseClient).storage
      .from(BUCKET)
      .upload(`${MY_SLUG}/anon-480.jpg`, bytes(), { contentType: "image/jpeg" });
    expect(error).not.toBeNull();
  });

  it("is readable by the service role, which is how the Worker serves it", async () => {
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${MY_SLUG}/probe-480.jpg`, {
      headers: { Authorization: `Bearer ${serviceKey}` },
    });
    expect(res.status).toBe(200);
  });

  it("is not readable without a token", async () => {
    const res = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${MY_SLUG}/probe-480.jpg`);
    expect(res.ok).toBe(false);
  });
});
