import { BusinessContext } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { pangkorMyHomestay } from "./pangkor-my-homestay.js";
import { rumahOmbak } from "./rumah-ombak.js";

/**
 * Fixtures are typed literals, so TypeScript checks their shape but nothing
 * checks the rules only Zod knows — an asset key that is really a URL, or a
 * `widths` array that does not end at `width`. These are the documents every
 * Channel is compiled from; they should be parsed at least once.
 */
describe("committed fixtures", () => {
  for (const [name, fixture] of [
    ["pangkor-my-homestay", pangkorMyHomestay],
    ["rumah-ombak", rumahOmbak],
  ] as const) {
    it(`${name} parses as a Business Context`, () => {
      expect(() => BusinessContext.parse(fixture)).not.toThrow();
    });
  }
});
