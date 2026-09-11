import { describe, expect, it } from "vitest";
import app from "../index.js";

/**
 * These pages exist to be read by a platform reviewer, so the things a reviewer
 * looks for are asserted rather than assumed: that they answer at all, that
 * they say who operates the service and how to reach them, and that they name
 * every platform the application connects to and every processor that holds
 * data. A privacy page that omits a connected platform is worse than none.
 */
const PLATFORMS = ["Google Business Profile", "Facebook", "Instagram", "TikTok"];

async function text(path: string) {
  const res = await app.request(path, {}, { ENVIRONMENT: "production" });
  expect(res.status, path).toBe(200);
  expect(res.headers.get("content-type") ?? "", path).toContain("text/html");
  return res.text();
}

describe("Laris's own pages", () => {
  it("answers on /, /privacy and /terms", async () => {
    for (const path of ["/", "/privacy", "/terms"]) await text(path);
  });

  it("names every platform the application connects to", async () => {
    const home = await text("/");
    const privacy = await text("/privacy");
    for (const platform of PLATFORMS) {
      expect(home, `home is missing ${platform}`).toContain(platform);
      expect(privacy, `privacy is missing ${platform}`).toContain(platform);
    }
  });

  it("names who holds the data", async () => {
    const privacy = await text("/privacy");
    for (const processor of ["Cloudflare", "Supabase"]) {
      expect(privacy).toContain(processor);
    }
  });

  it("gives one address for a deletion request, on both documents", async () => {
    for (const path of ["/privacy", "/terms"]) {
      expect(await text(path)).toContain("mailto:imstorage.my@gmail.com");
    }
  });

  it("says plainly that neither document has been reviewed by a lawyer", async () => {
    // Claiming otherwise by omission is the one thing these pages must not do.
    for (const path of ["/privacy", "/terms"]) {
      expect(await text(path)).toContain("reviewed by a lawyer");
    }
  });

  it("serves Laris at the root on this branch", async () => {
    // Deliberately narrow. #11 introduces host-based Merchant routing and its
    // own `/` handler; when these two branches meet, the Merchant host has to
    // be matched first or a live listing is replaced by an about page. That is
    // a merge to resolve, not something this test can assert from here.
    const res = await app.request("/", {}, { ENVIRONMENT: "production" });
    expect(await res.text()).toContain("Laris");
  });
});
