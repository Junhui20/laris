import { describe, expect, it } from "vitest";
import app from "./index.js";

/**
 * The environment boundary, tested from the outside.
 *
 * These assertions exist because this exact check has now failed open twice:
 * first as `!env.SUPABASE_URL`, which made every database-less deployment look
 * like a laptop, then as `!== "production"`, which did the same for a typo. A
 * comment saying the default is safe is not evidence; a request is.
 */
const get = (path: string, env: Record<string, string>) => app.request(path, {}, env);

describe("what an unrecognised ENVIRONMENT is treated as", () => {
  for (const [label, env] of [
    ["no binding at all", {}],
    ["the wrong case", { ENVIRONMENT: "Development" }],
    ["a typo", { ENVIRONMENT: "devlopment" }],
    ["something added later", { ENVIRONMENT: "staging" }],
    ["production", { ENVIRONMENT: "production" }],
  ] as const) {
    it(`keeps /v1 unavailable with ${label}`, async () => {
      expect((await get("/v1/merchants/rumah-ombak", env)).status).toBe(404);
    });

    it(`refuses the fixture with ${label}`, async () => {
      const res = await get("/site/rumah-ombak", env);
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: /Supabase is not configured/ });
    });

    // Drift Check reached the same fixture through its own gate. Merging #7
    // into this branch left `allowFixture: !c.env.SUPABASE_URL` in
    // drift/route.ts while index.tsx had already moved to ENVIRONMENT, so a
    // misspelled binding closed the front door and left this one open.
    it(`refuses the fixture through drift-check with ${label}`, async () => {
      const res = await app.request(
        "/v1/merchants/rumah-ombak/drift-check",
        { method: "POST", body: JSON.stringify({ url: "https://example.com" }) },
        env,
      );
      // The same loud 500 /site/ gives, not a 404: a misconfigured deployment
      // should be distinguishable from a Merchant that does not exist.
      expect(res.status).toBe(500);
    });
  }
});

describe("development, spelled correctly", () => {
  const dev = { ENVIRONMENT: "development" };

  it("opens /v1 when no token is configured", async () => {
    const res = await get("/v1/merchants/rumah-ombak", dev);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ vertical: "stay" });
  });

  it("serves the fixture site", async () => {
    expect((await get("/site/rumah-ombak", dev)).status).toBe(200);
  });
});

describe("the stopgap token", () => {
  it("rejects a caller with no bearer even in development", async () => {
    const env = { ENVIRONMENT: "development", API_TOKEN: "s3cret" };
    expect((await get("/v1/merchants/rumah-ombak", env)).status).toBe(401);
  });

  it("lets the right bearer through", async () => {
    const res = await app.request(
      "/v1/merchants/rumah-ombak",
      { headers: { authorization: "Bearer s3cret" } },
      { ENVIRONMENT: "production", ALLOW_FIXTURE: "true", API_TOKEN: "s3cret" },
    );
    expect(res.status).toBe(200);
  });
});

describe("the production fixture debt", () => {
  it("serves the site only when ALLOW_FIXTURE says so out loud", async () => {
    const env = { ENVIRONMENT: "production", ALLOW_FIXTURE: "true" };
    expect((await get("/site/rumah-ombak", env)).status).toBe(200);
  });
});
