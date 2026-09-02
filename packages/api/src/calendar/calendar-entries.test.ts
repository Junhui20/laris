import { describe, expect, it } from "vitest";
import { rumahOmbak } from "../fixtures/rumah-ombak.js";
import { deriveCalendarEntries, withDerivedCalendar } from "./calendar-entries.js";

describe("deriveCalendarEntries", () => {
  it("always carries Malay and English", () => {
    const entries = deriveCalendarEntries({ state: "perak", from: "2026-01-01", to: "2026-12-31" });
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(typeof entry.name).not.toBe("string");
      const name = entry.name as { ms: string; en: string };
      expect(name.ms.length).toBeGreaterThan(0);
      expect(name.en.length).toBeGreaterThan(0);
    }
  });

  it("carries Chinese where the gazette has it, and does not invent it", () => {
    const entries = deriveCalendarEntries({ state: "perak", from: "2026-01-01", to: "2026-12-31" });
    const withZh = entries.filter((entry) => (entry.name as { zh?: string }).zh);

    // Both of these matter. Chinese copy is a real output, and it is genuinely
    // partial upstream — school-holiday rows carry none at all. A caller has to
    // handle the gap, so the contract states it rather than a lucky sample
    // implying full coverage.
    expect(withZh.length).toBeGreaterThan(0);
    expect(withZh.length).toBeLessThan(entries.length);
    expect(
      entries
        .filter((e) => e.kind === "school_holiday")
        .every((e) => !(e.name as { zh?: string }).zh),
    ).toBe(true);
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
      expect((entry.endDate ?? entry.date) >= "2026-03-01").toBe(true);
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

  it("keeps derived entries that fall outside the refreshed window", () => {
    // Refreshing 2026 used to delete every 2027 entry on the Profile, silently,
    // because they were derived too.
    const withNextYear = withDerivedCalendar(ctx, { from: "2027-01-01", to: "2027-12-31" });
    const seeded = withNextYear.calendar.filter((entry) => entry.date.startsWith("2027-"));
    expect(seeded.length).toBeGreaterThan(0);

    const refreshed = withDerivedCalendar(withNextYear, { from: "2026-01-01", to: "2026-12-31" });
    expect(refreshed.calendar.filter((entry) => entry.date.startsWith("2027-"))).toEqual(seeded);
    expect(
      refreshed.calendar.filter((entry) => entry.date.startsWith("2026-")).length,
    ).toBeGreaterThan(0);
  });

  it("replaces rather than accumulates, so running it twice changes nothing", () => {
    const once = withDerivedCalendar(ctx, { from: "2026-01-01", to: "2026-12-31" });
    const twice = withDerivedCalendar(once, { from: "2026-01-01", to: "2026-12-31" });
    expect(twice.calendar).toEqual(once.calendar);
    expect(once.calendar.length).toBeGreaterThan(1);
  });
});
