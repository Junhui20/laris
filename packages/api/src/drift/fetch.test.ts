import { describe, expect, it, vi } from "vitest";
import { DriftFetchError, fetchPage, parsePublicPageUrl } from "./fetch.js";

const htmlResponse = (html: string, init: ResponseInit = {}) =>
  new Response(html, {
    ...init,
    headers: { "content-type": "text/html; charset=utf-8", ...init.headers },
  });

describe("parsePublicPageUrl", () => {
  it("accepts an ordinary public HTTP(S) hostname and removes the fragment", () => {
    expect(parsePublicPageUrl("https://Example.my/about#hours").href).toBe(
      "https://example.my/about",
    );
  });

  it.each([
    "ftp://example.my/file",
    "https://user:secret@example.my",
    "http://localhost",
    "http://shop.local",
    "http://intranet",
    "http://127.0.0.1",
    "http://[::1]",
    "https://example.my:8443",
  ])("rejects unsafe target %s", (value) => {
    expect(() => parsePublicPageUrl(value)).toThrow(DriftFetchError);
  });
});

describe("fetchPage", () => {
  it("returns HTML and the final URL", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(htmlResponse("<h1>Rumah Ombak</h1>"));

    await expect(fetchPage("https://example.my", { fetcher })).resolves.toEqual({
      requestedUrl: "https://example.my/",
      finalUrl: "https://example.my/",
      html: "<h1>Rumah Ombak</h1>",
    });
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://example.my/"),
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("follows a relative redirect after validating it", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/home" } }))
      .mockResolvedValueOnce(htmlResponse("<h1>Home</h1>"));

    const page = await fetchPage("https://example.my", { fetcher });
    expect(page.finalUrl).toBe("https://example.my/home");
  });

  it("rejects a redirect to a non-public target", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: "http://localhost/admin" } }),
      );

    await expect(fetchPage("https://example.my", { fetcher })).rejects.toMatchObject({
      code: "unsafe_url",
    });
  });

  it("enforces the redirect limit", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: "/again" } }));

    await expect(
      fetchPage("https://example.my", { fetcher, maxRedirects: 1 }),
    ).rejects.toMatchObject({ code: "redirect_limit" });
  });

  it("rejects a non-HTML response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } }));

    await expect(fetchPage("https://example.my", { fetcher })).rejects.toMatchObject({
      code: "not_html",
    });
  });

  it("rejects a declared oversized response before reading it", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      htmlResponse("small", {
        headers: { "content-length": "101", "content-type": "text/html" },
      }),
    );

    await expect(fetchPage("https://example.my", { fetcher, maxBytes: 100 })).rejects.toMatchObject(
      {
        code: "too_large",
      },
    );
  });

  it("caps the bytes actually read when Content-Length is absent", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(htmlResponse("x".repeat(101)));

    await expect(fetchPage("https://example.my", { fetcher, maxBytes: 100 })).rejects.toMatchObject(
      {
        code: "too_large",
      },
    );
  });

  it("maps a network failure without leaking an arbitrary thrown value", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("connection refused"));

    await expect(fetchPage("https://example.my", { fetcher })).rejects.toMatchObject({
      code: "upstream_error",
      message: "page fetch failed: connection refused",
    });
  });

  it("aborts an upstream request after the configured timeout", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    });

    await expect(fetchPage("https://example.my", { fetcher, timeoutMs: 1 })).rejects.toMatchObject({
      code: "upstream_error",
      message: "page fetch failed: aborted",
    });
  });
});
