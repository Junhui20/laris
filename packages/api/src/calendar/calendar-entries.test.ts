import { describe, expect, it } from "vitest";
import { rumahOmbak } from "../fixtures/rumah-ombak.js";
import { deriveCalendarEntries, withDerivedCalendar } from "./calendar-entries.js";

describe("deriveCalendarEntries", () => {
  it("carries the festival name in all three languages", () => {
    const entries = deriveCalendarEntries({
      state: "perak",
      from: "2026-01-01",
      to: "2026-01-01",
    });
    // Copy addresses the audience in its own language; the same window is three
    // different posts.
    expect(entries[0]?.name).toMatchObject({
      ms: "Tahun Baharu",
      en: "New Year's Day",
      zh: "元旦",
    });
  });

  it("marks everything it produces as coming from mycal, not the merchant", () => {
    const entries = deriveCalendarEntries({ state: "perak", from: "2026-01-01", to: "2026-12-31" });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.source === "mycal")).toBe(true);
  });

  it("gives a school holiday its span and this Merchant's own state", () => {
    const entries = deriveCalendarEntries({ state: "perak", from: "2026-05-01", to: "2026-06-30" });
    const midYear = entries.find((entry) => entry.kind === "school_holiday" && entry.endDate);

    expect(midYear).toMatchObject({
      date: "2026-05-23",
      endDate: "2026-06-07",
      kind: "school_holiday",
      states: ["perak"],
    });
  });

  it("reports a public holiday's states in Laris codes, not mycal's", () => {
    const entries = deriveCalendarEntries({
      state: "putrajaya",
      from: "2026-01-01",
      to: "2026-01-01",
    });
    // Upstream this reads `wp-putrajaya`, which is not a Laris StateCode.
    expect(entries[0]?.states).toContain("putrajaya");
    expect(entries[0]?.states).not.toContain("wp-putrajaya");
  });

  it("stays inside the range it was asked for, in date order", () => {
    const entries = deriveCalendarEntries({ state: "perak", from: "2026-03-01", to: "2026-03-31" });
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.endDate ?? entry.date >= "2026-03-01").toBeTruthy();
      expect(entry.date <= "2026-03-31").toBe(true);
    }
    const dates = entries.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("returns nothing for a year the snapshot does not cover", () => {
    expect(deriveCalendarEntries({ state: "perak", from: "2031-01-01", to: "2031-12-31" })).toEqual(
      [],
    );
  });
});

describe("withDerivedCalendar", () => {
  const ctx = {
    ...rumahOmbak,
    identity: { ...rumahOmbak.identity, state: "perak" as const },
    calendar: [
      {
        date: "2026-09-20",
        kind: "promo" as const,
        name: "Anniversary 20% off",
        source: "merchant" as const,
      },
    ],
  };

  it("never touches what the merchant wrote", () => {
    const refreshed = withDerivedCalendar(ctx, { from: "2026-09-01", to: "2026-09-30" });
    expect(refreshed.calendar).toContainEqual(ctx.calendar[0]);
  });

  it("replaces rather than accumulates, so running it twice changes nothing", () => {
    const once = withDerivedCalendar(ctx, { from: "2026-01-01", to: "2026-12-31" });
    const twice = withDerivedCalendar(once, { from: "2026-01-01", to: "2026-12-31" });
    expect(twice.calendar).toEqual(once.calendar);
    expect(once.calendar.length).toBeGreaterThan(1);
  });
});
