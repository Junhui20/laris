import { describe, expect, it } from "vitest";
import { coveredYears, larisStateCode, publicHolidays, schoolHolidays } from "./mycal.js";

describe("publicHolidays", () => {
  it("includes the replacement days the gazette file does not carry", () => {
    // A cuti ganti is an ordinary working day turned into a holiday. Filtering
    // the snapshot alone misses every one of them.
    const perak = publicHolidays("perak", 2026);
    const replacements = perak.filter((h) => h.type === "replacement");
    expect(replacements.length).toBeGreaterThan(0);
    expect(replacements.map((h) => h.date)).toContain("2026-02-02");
  });

  it("derives them from the state's own weekend, not KL's", () => {
    // Kelantan rests Friday–Saturday, so Labour Day 2026 on a Friday earns a
    // replacement there and nowhere in Kumpulan B.
    const kelantan = publicHolidays("kelantan", 2026).filter((h) => h.type === "replacement");
    const perak = publicHolidays("perak", 2026).filter((h) => h.type === "replacement");

    expect(kelantan.map((h) => h.date)).toContain("2026-05-03");
    expect(perak.map((h) => h.date)).not.toContain("2026-05-03");
  });

  it("gives two holidays sharing one Sunday two separate replacements", () => {
    // Federal Territory Day and Thaipusam both land on 2026-02-01 in KL.
    const kl = publicHolidays("kuala-lumpur", 2026);
    const dates = kl.filter((h) => h.type === "replacement").map((h) => h.date);
    expect(dates).toContain("2026-02-02");
    expect(dates).toContain("2026-02-03");
  });

  it("never returns the same holiday twice", () => {
    const ids = publicHolidays("selangor", 2026).map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stays inside the year asked for, in date order", () => {
    const holidays = publicHolidays("johor", 2026);
    expect(holidays.every((h) => h.date.startsWith("2026-"))).toBe(true);
    const dates = holidays.map((h) => h.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("returns nothing for a year the snapshot does not cover", () => {
    expect(publicHolidays("perak", 2031)).toEqual([]);
  });
});

describe("larisStateCode", () => {
  it("unprefixes the federal territories", () => {
    expect(larisStateCode("wp-putrajaya")).toBe("putrajaya");
    expect(larisStateCode("wp-labuan")).toBe("labuan");
  });

  it("passes through a federal marker", () => {
    expect(larisStateCode("*")).toBe("*");
  });

  it("throws on a code it cannot map rather than pretending", () => {
    // Casting this into StateCode is how an unsupported state ends up inside a
    // Business Profile looking like one we handle.
    expect(() => larisStateCode("wp-someplace")).toThrow(/no Laris StateCode/);
  });
});

describe("coverage", () => {
  it("says which years are confirmed-only", () => {
    const coverage = coveredYears();
    expect(coverage.holidays).toContain(2026);
    // 2027's lunar dates are still tentative upstream, so what we hold for it
    // is a floor. A caller must be able to tell that from an empty answer.
    expect(coverage.tentativeOmitted).toContain(2027);
  });

  it("reports the school calendar separately, because it lags", () => {
    const coverage = coveredYears();
    expect(coverage.holidays).toContain(2027);
    expect(coverage.schoolHolidays).not.toContain(2027);
    expect(schoolHolidays("perak", 2027)).toEqual([]);
  });
});
