import { Identity } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { driftCheck } from "./drift-check.js";

const identity = Identity.parse({
  name: "Rumah Ombak",
  addressLines: ["12 Jalan Batu Ferringhi"],
  area: "Batu Ferringhi",
  postcode: "11100",
  state: "pulau-pinang",
  phone: "+60 12-345 6789",
  hours: [],
});

describe("driftCheck", () => {
  it("implements the pure fetched-page plus Profile boundary", () => {
    const mismatches = driftCheck(
      {
        requestedUrl: "https://example.my/",
        finalUrl: "https://www.example.my/",
        html: `<script type="application/ld+json">
          {"@type":"LodgingBusiness","name":"Rumah Angin","telephone":"0123456789"}
        </script>`,
      },
      identity,
    );

    expect(mismatches).toEqual([
      {
        field: "name",
        profileValue: "Rumah Ombak",
        channelValue: "Rumah Angin",
        confidence: "certain",
        source: "json-ld",
      },
    ]);
  });
});
