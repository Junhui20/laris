import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../index.js";

const endpoint = "http://localhost/v1/merchants/rumah-ombak/drift-check";

/**
 * The fixture Merchant is a development affordance, so these tests have to say
 * so. They used to pass an empty env and rely on `!SUPABASE_URL` meaning
 * "laptop"; that inference is gone — see `src/env.ts` — and only the exact
 * string opens the fixture now.
 */
const dev = { ENVIRONMENT: "development" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /v1/merchants/:slug/drift-check", () => {
  it("returns certain mismatches against the fixture Merchant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          `<script type="application/ld+json">
            {
              "@type": "LodgingBusiness",
              "name": "Rumah Angin",
              "telephone": "+60 12-000 0000"
            }
          </script>`,
          { headers: { "content-type": "text/html" } },
        ),
      ),
    );

    const response = await app.request(
      endpoint,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.my" }),
      },
      dev,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      mismatches: [
        { field: "name", confidence: "certain", source: "json-ld" },
        { field: "phone", confidence: "certain", source: "json-ld" },
      ],
    });
  });

  it("rejects malformed input before making a subrequest", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await app.request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: 42 }),
    });

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a non-public target", async () => {
    const response = await app.request(
      endpoint,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "http://localhost/admin" }),
      },
      dev,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "unsafe_url" });
  });

  it("returns 404 for an unknown Merchant before fetching the page", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await app.request(
      "http://localhost/v1/merchants/unknown/drift-check",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.my" }),
      },
      dev,
    );

    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
