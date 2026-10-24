import { StateCode } from "@laris/schema";
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

  it("derives them from the state's own replaced weekday, not KL's", () => {
    // Only one weekday rolls: Friday in Kedah, Saturday in Kelantan, Sunday in
    // Kumpulan B. Labour Day 2026 is a Friday, Nuzul Al-Quran a Saturday.
    const dates = (state: StateCode) =>
      publicHolidays(state, 2026)
        .filter((h) => h.type === "replacement")
        .map((h) => h.date);

    expect(dates("kedah")).toContain("2026-05-03");
    expect(dates("kelantan")).not.toContain("2026-05-03");
    expect(dates("kelantan")).toContain("2026-03-08");
    expect(dates("perak")).not.toContain("2026-05-03");
    expect(dates("perak")).not.toContain("2026-03-08");
  });

  it("lets two holidays sharing one Sunday share one replacement day", () => {
    // Federal Territory Day and Thaipusam both land on 2026-02-01 in KL.
    const kl = publicHolidays("kuala-lumpur", 2026);
    const dates = kl.filter((h) => h.type === "replacement").map((h) => h.date);
    expect(dates.filter((d) => d === "2026-02-02")).toHaveLength(2);
    expect(dates).not.toContain("2026-02-03");
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

  it("lets no tentative holiday back in through its replacement", () => {
    // 2027's lunar dates are estimates upstream. Filtering the gazette is not
    // enough: mycal calculates replacements for them too and copies the status
    // across, so Awal Muharram and Maulidur Rasul would return as cuti ganti
    // and land in a rate calendar as certain peak nights.
    for (const year of coveredYears().holidays) {
      for (const state of StateCode.options) {
        const escaped = publicHolidays(state, year).filter((h) => h.status !== "confirmed");
        expect(escaped.map((h) => `${state} ${h.id}`)).toEqual([]);
      }
    }
  });

  it("keeps the replacements a confirmed holiday earns in a tentative year", () => {
    // The filter must not empty 2027 wholesale — the confirmed half still has
    // weekend clashes, and those nights are real.
    const perak2027 = publicHolidays("perak", 2027);
    expect(perak2027.length).toBeGreaterThan(0);
    expect(perak2027.some((h) => h.type === "replacement")).toBe(true);
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
