import { describe, expect, it } from "vitest";
import { Photo } from "./common.js";

const base = { key: "pangkor-my-homestay/frontage", width: 1080, height: 740, widths: [1080] };

describe("Photo", () => {
  it("accepts a real variant set", () => {
    expect(Photo.parse({ ...base, width: 1080, widths: [360, 720, 1080] }).widths).toEqual([
      360, 720, 1080,
    ]);
  });

  it("rejects a URL where an asset key belongs", () => {
    expect(() => Photo.parse({ ...base, key: "https://example.com/a.jpg" })).toThrow();
  });

  it("rejects variants out of order, because srcset reads them in order", () => {
    expect(() => Photo.parse({ ...base, widths: [1080, 360] })).toThrow(/ascending and unique/);
  });

  it("rejects a repeated variant", () => {
    expect(() => Photo.parse({ ...base, widths: [720, 720, 1080] })).toThrow(
      /ascending and unique/,
    );
  });

  it("rejects an intrinsic width no stored variant has", () => {
    // `width` is what reserves space in the layout and what the browser trusts
    // as the largest source. If nothing that size exists, it is a wrong number.
    expect(() => Photo.parse({ ...base, width: 1600, widths: [360, 720, 1080] })).toThrow(
      /must end at 1600/,
    );
  });
});
