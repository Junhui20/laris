import { BusinessContext, type stay as stayNs } from "@laris/schema";

type StayProfile = stayNs.StayProfile;

/**
 * Every number that reaches the screen, pulled out of the Business Profile.
 *
 * The first version of this package hard-coded the merchant's facts in the
 * plan compiler and hard-coded three more inside the card composition. The PR
 * claimed a Profile-to-plan boundary that did not exist: an edit to the Profile
 * would leave a valid-looking but stale marketing asset, and nothing would say
 * so.
 *
 * So the copy is written as templates and the values are read from here. Some
 * come from schema fields; the rest live only in the offering's prose, and
 * those are extracted with a pattern that **throws** when the Profile stops
 * saying it. A claim that cannot be traced back is a build failure, not a
 * silent lie in a video.
 */
export type Facts = {
  slug: string;
  name: string;
  whatsapp: string;
  bedrooms: number;
  capacityLow: number;
  capacityPax: number;
  /** With the extra beds she rents. Lives in the description and the FAQ. */
  maxPax: number;
  loftBeds: number;
  aircon: number;
  fans: number;
  beachWalkMin: number;
  storeWalkMin: number;
};

function number(haystack: string, pattern: RegExp, what: string): number {
  const found = haystack.match(pattern);
  const value = found?.[1] ? Number(found[1]) : Number.NaN;
  if (!Number.isFinite(value)) {
    throw new Error(
      `the Business Profile no longer states ${what} (${pattern}). Either the Profile changed or the copy is claiming something it does not say.`,
    );
  }
  return value;
}

function present(haystack: string, phrase: string, what: string): void {
  if (!haystack.includes(phrase)) {
    throw new Error(`the Business Profile no longer says ${what} ("${phrase}")`);
  }
}

function landmarkWalk(profile: StayProfile, name: string): number {
  const found = profile.landmarks.find((l: { name: string; walkMin?: number }) =>
    l.name.includes(name),
  );
  if (found?.walkMin === undefined) {
    throw new Error(`no walking time on the "${name}" landmark in the Business Profile`);
  }
  return found.walkMin;
}

export function readFacts(raw: unknown, slug: string): Facts {
  const profile = BusinessContext.parse(raw);
  const stay = profile.verticalProfile.stay;
  const offering = profile.offerings[0];

  if (!stay) throw new Error("this plan is for a `stay` Merchant");
  if (!offering || offering.kind !== "room_type") throw new Error("no room type on the Profile");
  if (!offering.isWholePlace) {
    throw new Error("the copy sells a whole house; this offering is not one");
  }
  if (offering.bedrooms === undefined) throw new Error("no bedroom count on the offering");
  if (!profile.identity.whatsapp) throw new Error("no WhatsApp number on the Profile");

  // The prose the offering and the FAQ actually carry. Everything a template
  // interpolates has to be findable in here or in a schema field.
  const prose = [offering.description ?? "", ...profile.faq.map((f) => f.a)].join(" ");

  present(prose, "每间房内自带卫浴", "that every bedroom has its own bathroom");
  present(prose, "楼上楼下两个客厅", "that there are two living rooms");
  present(prose, "免费", "that the mahjong table, karaoke and bicycles are free");

  return {
    slug,
    name: profile.identity.name,
    whatsapp: profile.identity.whatsapp,
    bedrooms: offering.bedrooms,
    capacityPax: offering.capacityPax,
    capacityLow: number(prose, /(\d+)\s*到\s*\d+\s*人/, "the lower end of its capacity"),
    maxPax: number(prose, /加到\s*(\d+)\s*人/, "how many it sleeps with extra beds"),
    loftBeds: number(prose, /小格楼\s*(\d+)\s*个床位/, "how many beds are in the loft"),
    aircon: number(prose, /(\d+)\s*架冷气/, "how many air conditioners"),
    fans: number(prose, /(\d+)\s*架风扇/, "how many fans"),
    beachWalkMin: landmarkWalk(stay, "海滩"),
    storeWalkMin: landmarkWalk(stay, "7-Eleven"),
  };
}
