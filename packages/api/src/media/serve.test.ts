import { describe, expect, it, vi } from "vitest";
import { serveMedia } from "./serve.js";

const CONFIGURED = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
};

/**
 * The Worker is the only reader of a private bucket, so this route is the whole
 * boundary between a merchant's photographs and the internet. What it refuses
 * matters more than what it serves.
 */
describe("serving merchant media", () => {
  it("refuses anything that could not be a Photo key", async () => {
    for (const path of [
      "../secrets.jpg",
      "slug/../../etc/passwd-480.jpg",
      "slug/photo.jpg", // no width suffix
      "slug/photo-480.png", // not a jpeg
      "/leading-slash-480.jpg",
      "Slug/Photo-480.jpg", // the key regex is lowercase
      "slug/photo-480.jpg?x=1",
    ]) {
      const res = await serveMedia(CONFIGURED, path);
      expect(res.status, path).toBe(404);
    }
  });

  it("does not reach for the bucket when it has been given a bad path", async () => {
    // A probe should cost nothing. Round-tripping to Supabase to be told no is
    // how a scanner turns into a bill.
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await serveMedia(CONFIGURED, "../nope.jpg");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("says it is unconfigured rather than pretending the photo is missing", async () => {
    const res = await serveMedia({}, "slug/photo-480.jpg");
    expect(res.status).toBe(503);
  });

  it("caches hard, because a key names one set of bytes forever", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bytes", { headers: { "content-type": "image/jpeg" } }));
    const res = await serveMedia(CONFIGURED, "pangkor/frontage-a1b2c3-960.jpg");

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://project.supabase.co/storage/v1/object/merchant-media/pangkor/frontage-a1b2c3-960.jpg",
      { headers: { Authorization: "Bearer service-role" } },
    );
    fetchSpy.mockRestore();
  });

  it("passes a miss through as a miss and an upstream fault as a fault", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response("", { status: 404 }));
    expect((await serveMedia(CONFIGURED, "a/b-480.jpg")).status).toBe(404);

    fetchSpy.mockResolvedValueOnce(new Response("", { status: 500 }));
    expect((await serveMedia(CONFIGURED, "a/b-480.jpg")).status).toBe(502);
    fetchSpy.mockRestore();
  });
});
