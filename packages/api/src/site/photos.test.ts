import { Photo } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { largestPhotoUrl, photoSrcSet, photoUrl } from "./photos.js";

const photo = Photo.parse({
  key: "pangkor-my-homestay/frontage-sky",
  width: 1080,
  height: 740,
  widths: [540, 1080],
});

describe("AssetKey", () => {
  it("refuses a URL, so a hostname cannot get into a Business Profile", () => {
    // The same Profile compiles a Site, a GBP listing and social posts. A
    // stored origin is wrong in at least two of them.
    expect(Photo.safeParse({ ...photo, key: "https://example.test/a.jpg" }).success).toBe(false);
    expect(Photo.safeParse({ ...photo, key: "/m/a.jpg" }).success).toBe(false);
  });

  it("refuses traversal", () => {
    expect(Photo.safeParse({ ...photo, key: "a/../../etc/passwd" }).success).toBe(false);
  });

  it("needs at least one stored variant", () => {
    expect(Photo.safeParse({ ...photo, widths: [] }).success).toBe(false);
  });
});

describe("resolving a key", () => {
  it("hangs the photo off whichever origin is serving the page", () => {
    expect(photoUrl("https://pangkormyhomestay.top", photo, 1080)).toBe(
      "https://pangkormyhomestay.top/m/pangkor-my-homestay/frontage-sky-1080.jpg",
    );
    expect(photoUrl("http://localhost:8787", photo, 1080)).toBe(
      "http://localhost:8787/m/pangkor-my-homestay/frontage-sky-1080.jpg",
    );
  });

  it("offers every variant to the browser, largest to a Channel that cannot choose", () => {
    expect(photoSrcSet("https://x.test", photo)).toBe(
      "https://x.test/m/pangkor-my-homestay/frontage-sky-540.jpg 540w, " +
        "https://x.test/m/pangkor-my-homestay/frontage-sky-1080.jpg 1080w",
    );
    expect(largestPhotoUrl("https://x.test", photo)).toContain("-1080.jpg");
  });
});
