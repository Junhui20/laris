import { describe, expect, it } from "vitest";
import { parseOpeningHours } from "./hours.js";

describe("parseOpeningHours", () => {
  it("expands a weekday range", () => {
    expect(parseOpeningHours(["Mo-Fr 09:00-18:00"])).toEqual([
      { weekday: 1, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 2, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 3, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 4, opens: "09:00", closes: "18:00", closesNextDay: false },
      { weekday: 5, opens: "09:00", closes: "18:00", closesNextDay: false },
    ]);
  });

  it("supports comma-separated days and an overnight close", () => {
    expect(parseOpeningHours(["Fr,Sa 18:00–02:00"])).toEqual([
      { weekday: 5, opens: "18:00", closes: "02:00", closesNextDay: true },
      { weekday: 6, opens: "18:00", closes: "02:00", closesNextDay: true },
    ]);
  });

  it("supports a week-wrapping range", () => {
    expect(parseOpeningHours(["Fr-Mo 10:00-17:00"])?.map((entry) => entry.weekday)).toEqual([
      0, 1, 5, 6,
    ]);
  });

  it.each([
    { value: [] },
    { value: ["every day"] },
    { value: ["Mo-Fr 9am-6pm"] },
    { value: ["Mo-Fr 24:00-01:00"] },
  ])("stays silent when the complete value cannot be parsed: $value", ({ value }) => {
    expect(parseOpeningHours(value)).toBeNull();
  });
});
