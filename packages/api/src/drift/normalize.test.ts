import type { OpeningHours } from "@laris/schema";
import { describe, expect, it } from "vitest";
import {
  normalizeAddress,
  normalizeName,
  normalizePhone,
  normalizeWeeklyHours,
  serializeWeeklyHours,
} from "./normalize.js";

describe("normalizePhone", () => {
  it.each(["+60 12-345 6789", "012-345 6789", "+60123456789", "0060 12 345 6789"])(
    "treats %s as the same Malaysian number",
    (value) => {
      expect(normalizePhone(value)).toBe("60123456789");
    },
  );

  it("accepts a labelled number without treating the label as content", () => {
    expect(normalizePhone("tel: 04-881 2345")).toBe("6048812345");
  });

  it.each(["12345", "call us", "12 3456 7890"])("stays silent for ambiguous input %s", (value) => {
    expect(normalizePhone(value)).toBeNull();
  });
});

describe("normalizeName", () => {
  it("normalises Unicode width, case, punctuation and whitespace", () => {
    expect(normalizeName("  RUMAH．  Ombak  ")).toBe("rumah ombak");
  });
});

describe("normalizeAddress", () => {
  it("treats the certain Jln abbreviation as Jalan", () => {
    expect(normalizeAddress("12, Jln Batu Ferringhi")).toBe(
      normalizeAddress("12 Jalan Batu Ferringhi"),
    );
  });

  it("does not erase meaningful address tokens", () => {
    expect(normalizeAddress("12 Jalan Pantai")).not.toBe(normalizeAddress("21 Jalan Pantai"));
  });
});

describe("normalizeWeeklyHours", () => {
  it("sorts weekdays and multiple intervals deterministically", () => {
    const hours: OpeningHours[] = [
      { weekday: 6, opens: "14:00", closes: "18:00", closesNextDay: false },
      { weekday: 1, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 6, opens: "09:00", closes: "12:00", closesNextDay: false },
    ];

    expect(serializeWeeklyHours(normalizeWeeklyHours(hours))).toBe(
      "1:09:00-18:00;6:09:00-12:00,6:14:00-18:00",
    );
  });

  it("preserves an overnight close as a different fact", () => {
    const sameDay: OpeningHours[] = [
      { weekday: 5, opens: "18:00", closes: "02:00", closesNextDay: false },
    ];
    const overnight: OpeningHours[] = [
      { weekday: 5, opens: "18:00", closes: "02:00", closesNextDay: true },
    ];

    expect(serializeWeeklyHours(normalizeWeeklyHours(sameDay))).not.toBe(
      serializeWeeklyHours(normalizeWeeklyHours(overnight)),
    );
  });
});
