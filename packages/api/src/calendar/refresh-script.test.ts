import { StateCode } from "@laris/schema";
import { describe, expect, it } from "vitest";
// The refresh script is plain node — it cannot import the TypeScript schema —
// so it spells the state table out. This is what stops the copy drifting.
import {
  LARIS_BY_MYCAL_CODE,
  unmappedStateTokens,
} from "../../../../scripts/refresh-calendar-data.mjs";

describe("refresh script state table", () => {
  it("maps to exactly the StateCodes Laris supports", () => {
    expect([...new Set(LARIS_BY_MYCAL_CODE.values())].sort()).toEqual(
      [...StateCode.options].sort(),
    );
  });

  it("knows mycal's prefixed federal territories", () => {
    expect(LARIS_BY_MYCAL_CODE.get("wp-labuan")).toBe("labuan");
    expect(LARIS_BY_MYCAL_CODE.get("wp-putrajaya")).toBe("putrajaya");
  });

  it("rejects a token it cannot place, and allows the federal marker", () => {
    expect(unmappedStateTokens(["perak", "*", "wp-labuan"])).toEqual([]);
    expect(unmappedStateTokens(["perak", "wp-someplace"])).toEqual(["wp-someplace"]);
  });
});
