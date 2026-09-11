import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { rumahOmbak } = await import("../fixtures/rumah-ombak.js");
const { getBusinessContext, insertMerchant, putBusinessContext } = await import("./merchant.js");

const CONFIGURED = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };

/**
 * A stand-in for the query builder that answers a queued list of results in
 * order and records what was asked. Stubbing the transport rather than the
 * repo keeps the filters under test — `eq("business_context->>updatedAt", …)`
 * is the whole concurrency mechanism, and a hand-rolled fake repo would not
 * have one.
 */
function stubSupabase(results: { data: unknown; error: { message: string } | null }[]) {
  const calls: [string, ...unknown[]][] = [];
  let next = 0;
  const answer = () => results[next++] ?? { data: null, error: null };

  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "update", "insert"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.maybeSingle = () => Promise.resolve(answer());
  builder.single = () => Promise.resolve(answer());

  createClient.mockReturnValue({ from: () => builder });
  return calls;
}

beforeEach(() => {
  createClient.mockReset();
});

describe("getBusinessContext", () => {
  it("serves the fixture only where fixtures are allowed", async () => {
    expect(await getBusinessContext({}, "rumah-ombak", { allowFixture: true })).toEqual(rumahOmbak);
  });

  it("refuses to guess when Supabase is missing in production", async () => {
    await expect(getBusinessContext({}, "rumah-ombak", { allowFixture: false })).rejects.toThrow(
      /Supabase is not configured/,
    );
  });
});

describe("putBusinessContext", () => {
  it("never falls back to a fixture — a write with nowhere to go must fail", async () => {
    await expect(
      putBusinessContext({}, "rumah-ombak", rumahOmbak, {
        expectedUpdatedAt: rumahOmbak.updatedAt,
      }),
    ).rejects.toThrow(/Supabase is not configured/);
  });

  it("matches on the document's own updatedAt, and stamps a new one", async () => {
    const stored = { ...rumahOmbak, updatedAt: "2026-09-02T04:00:00.000Z" };
    const calls = stubSupabase([{ data: { business_context: stored }, error: null }]);

    const before = Date.now();
    const result = await putBusinessContext(CONFIGURED, "rumah-ombak", rumahOmbak, {
      expectedUpdatedAt: rumahOmbak.updatedAt,
    });

    expect(result.ok).toBe(true);
    expect(calls).toContainEqual(["eq", "business_context->>updatedAt", rumahOmbak.updatedAt]);

    const written = calls.find(([method]) => method === "update")?.[1] as {
      business_context: { updatedAt: string };
    };
    expect(Date.parse(written.business_context.updatedAt)).toBeGreaterThanOrEqual(before);
  });

  it("calls it a conflict when the row is there but moved on", async () => {
    stubSupabase([
      { data: null, error: null },
      { data: { slug: "rumah-ombak" }, error: null },
    ]);

    expect(
      await putBusinessContext(CONFIGURED, "rumah-ombak", rumahOmbak, {
        expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "conflict" });
  });

  it("calls it not-found when there is no such Merchant", async () => {
    stubSupabase([
      { data: null, error: null },
      { data: null, error: null },
    ]);

    expect(
      await putBusinessContext(CONFIGURED, "nobody", rumahOmbak, {
        expectedUpdatedAt: rumahOmbak.updatedAt,
      }),
    ).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("insertMerchant", () => {
  it("writes the ids the row constraints check against", async () => {
    const calls = stubSupabase([{ data: { business_context: rumahOmbak }, error: null }]);
    await insertMerchant(CONFIGURED, "rumah-ombak", rumahOmbak);

    expect(calls.find(([method]) => method === "insert")?.[1]).toMatchObject({
      id: rumahOmbak.merchantId,
      account_id: rumahOmbak.accountId,
      slug: "rumah-ombak",
    });
  });
});
