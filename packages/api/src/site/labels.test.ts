import { StateCode } from "@laris/schema";
import { stay } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { amenityEn, amenityZh, stateOfficial, stateZh } from "./labels.js";

describe("display labels", () => {
  it("never shows a guest the raw code", () => {
    // The maps are Record<StateCode, string>, so a new state is a type error
    // rather than a page that quietly reads "negeri-sembilan".
    for (const code of StateCode.options) {
      expect(stateZh(code)).not.toBe(code);
      expect(stateOfficial(code)).not.toBe(code);
    }
    for (const amenity of stay.Amenity.options) {
      expect(amenityZh(amenity)).not.toBe(amenity);
      expect(amenityEn(amenity)).not.toBe(amenity);
    }
  });

  it("spells the federal territories the way an address does", () => {
    expect(stateOfficial("kuala-lumpur")).toBe("Wilayah Persekutuan Kuala Lumpur");
    expect(stateZh("kuala-lumpur")).toBe("吉隆坡");
  });

  it("keeps the page and the structured data in different languages on purpose", () => {
    expect(stateZh("perak")).toBe("霹雳");
    expect(stateOfficial("perak")).toBe("Perak");
  });
});
