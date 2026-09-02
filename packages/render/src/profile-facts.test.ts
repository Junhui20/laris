import type { BusinessContext } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { pangkorMyHomestay } from "../../api/src/fixtures/pangkor-my-homestay.js";
import { readFacts } from "./profile-facts.js";

/**
 * The link between the Business Profile and what appears on screen.
 *
 * The first version of this package retyped the merchant's facts into the plan
 * compiler and into the card composition, while the PR claimed the Profile was
 * the source. An edit to the Profile would have left a valid-looking but stale
 * marketing asset behind, and nothing would have said so. These assertions are
 * what makes that claim true: change the Profile and the numbers change, or
 * take a fact out of it and the build refuses.
 */
const clone = (): BusinessContext => structuredClone(pangkorMyHomestay);

describe("facts read from the Business Profile", () => {
  it("takes every on-screen number from the Profile as it stands", () => {
    const facts = readFacts(pangkorMyHomestay, "pangkor-my-homestay");
    expect(facts).toMatchObject({
      bedrooms: 4,
      capacityLow: 12,
      capacityPax: 15,
      maxPax: 20,
      loftBeds: 3,
      aircon: 7,
      fans: 7,
      beachWalkMin: 13,
      storeWalkMin: 2,
      whatsapp: "+60125358226",
    });
  });

  it("changes when the Profile changes", () => {
    const profile = clone();
    profile.offerings[0] = { ...profile.offerings[0], bedrooms: 5, capacityPax: 18 } as never;
    const facts = readFacts(profile, "pangkor-my-homestay");
    expect(facts.bedrooms).toBe(5);
    expect(facts.capacityPax).toBe(18);
  });

  it("follows a landmark whose walking time was corrected", () => {
    const profile = clone();
    const stay = profile.verticalProfile.stay;
    if (!stay) throw new Error("fixture lost its stay profile");
    stay.landmarks = stay.landmarks.map((l) =>
      l.name.includes("海滩") ? { ...l, walkMin: 16 } : l,
    );
    expect(readFacts(profile, "pangkor-my-homestay").beachWalkMin).toBe(16);
  });

  for (const [what, mutate] of [
    [
      "the description stops saying how many beds are in the loft",
      (p: BusinessContext) => {
        const offering = p.offerings[0];
        if (offering)
          offering.description = (offering.description ?? "").replace("小格楼 3 个床位", "");
      },
    ],
    [
      "nothing says the bedrooms have their own bathrooms",
      (p: BusinessContext) => {
        const offering = p.offerings[0];
        if (offering)
          offering.description = (offering.description ?? "").replace("每间房内自带卫浴", "");
        p.faq = p.faq.map((f) => ({ ...f, a: f.a.replace(/自带卫浴/g, "") }));
      },
    ],
    [
      "the beach landmark loses its walking time",
      (p: BusinessContext) => {
        const stay = p.verticalProfile.stay;
        if (stay) {
          stay.landmarks = stay.landmarks.map((l) =>
            l.name.includes("海滩") ? { name: l.name, driveMin: l.driveMin } : l,
          );
        }
      },
    ],
  ] as const) {
    it(`refuses to build when ${what}`, () => {
      const profile = clone();
      mutate(profile);
      // A claim the Profile no longer supports has to stop the build. The
      // alternative is a video that keeps saying it.
      expect(() => readFacts(profile, "pangkor-my-homestay")).toThrow();
    });
  }
});
