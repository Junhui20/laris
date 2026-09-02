import { Identity, type OpeningHours } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { compareIdentity } from "./compare.js";
import type { ExtractedIdentity, ExtractedValue } from "./types.js";

const profile = Identity.parse({
  name: "Rumah Ombak",
  addressLines: ["12 Jalan Batu Ferringhi"],
  area: "Batu Ferringhi",
  postcode: "11100",
  state: "pulau-pinang",
  phone: "+60 12-345 6789",
  hours: [
    { weekday: 1, opens: "09:00", closes: "18:00" },
    { weekday: 6, opens: "09:00", closes: "13:00" },
  ],
});

const certain = <T>(value: T, raw: string): ExtractedValue<T> => ({
  value,
  raw,
  source: "json-ld",
  confidence: "certain",
});

describe("compareIdentity", () => {
  it("treats conservatively normalised values as equal", () => {
    const extracted: ExtractedIdentity = {
      name: certain("RUMAH OMBak.", "RUMAH OMBak."),
      phone: certain("0123456789", "0123456789"),
      address: certain(
        {
          streetAddress: "12 Jln Batu Ferringhi",
          area: "Batu Ferringhi",
          postcode: "11100",
          state: "Penang",
        },
        "12 Jln Batu Ferringhi, Batu Ferringhi, 11100, Penang",
      ),
      hours: certain(profile.hours, "same hours"),
    };

    expect(compareIdentity(extracted, profile)).toEqual([]);
  });

  it("reports certain name and phone contradictions with their source", () => {
    const extracted: ExtractedIdentity = {
      name: certain("Rumah Angin", "Rumah Angin"),
      phone: {
        ...certain("+60 12-000 0000", "+60 12-000 0000"),
        source: "microdata",
      },
    };

    expect(compareIdentity(extracted, profile)).toEqual([
      {
        field: "name",
        profileValue: "Rumah Ombak",
        channelValue: "Rumah Angin",
        confidence: "certain",
        source: "json-ld",
      },
      {
        field: "phone",
        profileValue: "+60 12-345 6789",
        channelValue: "+60 12-000 0000",
        confidence: "certain",
        source: "microdata",
      },
    ]);
  });

  it("suppresses likely and unparseable values", () => {
    const extracted: ExtractedIdentity = {
      name: {
        value: "Maybe Another Shop",
        raw: "Maybe Another Shop",
        source: "text",
        confidence: "likely",
      },
      phone: certain("call us", "call us"),
      address: {
        value: { streetAddress: "Somewhere else" },
        raw: "Somewhere else",
        source: "text",
        confidence: "likely",
      },
    };

    expect(compareIdentity(extracted, profile)).toEqual([]);
  });

  it("reports a certain postcode contradiction", () => {
    expect(
      compareIdentity(
        {
          address: certain(
            { streetAddress: "21 Jalan Batu Ferringhi", postcode: "11200" },
            "21 Jalan Batu Ferringhi, 11200",
          ),
        },
        profile,
      ),
    ).toMatchObject([
      {
        field: "address",
        profileValue: "12 Jalan Batu Ferringhi, Batu Ferringhi, 11100, Pulau Pinang",
        confidence: "certain",
      },
    ]);
  });

  it("extracts a five-digit postcode before comparing it", () => {
    const klProfile = Identity.parse({
      ...profile,
      postcode: "50450",
      state: "kuala-lumpur",
    });

    expect(
      compareIdentity(
        {
          address: certain({ postcode: "50450 Kuala Lumpur" }, "50450 Kuala Lumpur"),
        },
        klProfile,
      ),
    ).toEqual([]);
  });

  it.each([
    ["Selangor Darul Ehsan", "selangor"],
    ["Wilayah Persekutuan Kuala Lumpur", "kuala-lumpur"],
    ["Malacca", "melaka"],
  ] as const)("stays silent for unresolved state spelling %s", (channelState, profileState) => {
    const stateProfile = Identity.parse({ ...profile, state: profileState });

    expect(
      compareIdentity(
        {
          address: certain({ state: channelState }, channelState),
        },
        stateProfile,
      ),
    ).toEqual([]);
  });

  it("still reports a contradiction between two canonical state codes", () => {
    const stateProfile = Identity.parse({ ...profile, state: "selangor" });

    expect(
      compareIdentity(
        {
          address: certain({ state: "perak" }, "Perak"),
        },
        stateProfile,
      ),
    ).toMatchObject([{ field: "address", confidence: "certain" }]);
  });

  it("stays silent when Malaysian unit-number punctuation does not line up", () => {
    const unitProfile = Identity.parse({
      ...profile,
      addressLines: ["No. 12-A Jalan Batu Ferringhi"],
    });

    expect(
      compareIdentity(
        {
          address: certain(
            { streetAddress: "12A Jalan Batu Ferringhi" },
            "12A Jalan Batu Ferringhi",
          ),
        },
        unitProfile,
      ),
    ).toEqual([]);
  });

  it("compares only hours that the Channel explicitly states", () => {
    const mondayOnly: OpeningHours[] = [
      { weekday: 1, opens: "09:00", closes: "18:00", closesNextDay: false },
    ];
    expect(compareIdentity({ hours: certain(mondayOnly, "Mo 09:00-18:00") }, profile)).toEqual([]);

    const changedMonday: OpeningHours[] = [
      { weekday: 1, opens: "10:00", closes: "18:00", closesNextDay: false },
    ];
    expect(
      compareIdentity({ hours: certain(changedMonday, "Mo 10:00-18:00") }, profile),
    ).toMatchObject([
      {
        field: "hours",
        profileValue: "Mon 09:00–18:00; Sat 09:00–13:00",
        confidence: "certain",
      },
    ]);
  });

  it("stays silent when the Channel states a weekday missing from the Profile", () => {
    const sunday: OpeningHours[] = [
      { weekday: 0, opens: "09:00", closes: "18:00", closesNextDay: false },
    ];
    expect(compareIdentity({ hours: certain(sunday, "Su 09:00-18:00") }, profile)).toEqual([]);
  });

  it("stays silent when the Merchant has not filled in hours", () => {
    const profileWithoutHours = Identity.parse({ ...profile, hours: [] });
    const monday: OpeningHours[] = [
      { weekday: 1, opens: "09:00", closes: "18:00", closesNextDay: false },
    ];

    expect(
      compareIdentity({ hours: certain(monday, "Mo 09:00-18:00") }, profileWithoutHours),
    ).toEqual([]);
  });
});
