import { describe, expect, it } from "vitest";
import { DEFAULT_PEAK_MULTIPLIERS, deriveRateCalendar } from "./rate-calendar.js";

const BASE = 25_000;

/** The same rounding the module applies, so a multiplier change cannot make
 * these assertions quietly wrong the way whole-ringgit multipliers did. */
const peak = (multiplier: number) => Math.round((BASE * multiplier) / 100) * 100;

const derive = (
  state: Parameters<typeof deriveRateCalendar>[0]["state"],
  from: string,
  to: string,
) => deriveRateCalendar({ state, baseRateCents: BASE, from, to });

describe("deriveRateCalendar", () => {
  it("suggests, never applies — every window is derived", () => {
    const windows = derive("perak", "2026-01-01", "2026-12-31");
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((window) => window.derived)).toBe(true);
  });

  it("splits the school break by Kumpulan, not by the KL assumption", () => {
    const perak = derive("perak", "2026-03-01", "2026-04-05");
    const kelantan = derive("kelantan", "2026-03-01", "2026-04-05");

    // Perak is group B, Kelantan group A. One day apart, and wrong in one of
    // them if the state is ignored — quietly, which is the dangerous part.
    expect(perak.find((w) => w.label === "Term 1 Break")).toMatchObject({
      from: "2026-03-19",
      to: "2026-03-29",
    });
    expect(kelantan.find((w) => w.label === "Term 1 Break")).toMatchObject({
      from: "2026-03-19",
      to: "2026-03-28",
    });
  });

  it("keeps a school break whole when public holidays fall inside it", () => {
    const windows = derive("perak", "2026-05-01", "2026-06-30");
    const midYear = windows.filter((window) => window.label === "Mid-Year Holiday");

    // Eid al-Adha, Vesak and the Agong's birthday all land inside this break.
    // The owner should be asked to approve one window, not five. It opens on
    // the Friday night before the break rather than the first day of it,
    // because that night is already a weekend night at the same rate.
    expect(midYear).toHaveLength(1);
    expect(midYear[0]).toMatchObject({ from: "2026-05-22", to: "2026-06-07" });
    expect(midYear[0]?.rateCents).toBe(peak(DEFAULT_PEAK_MULTIPLIERS.schoolHoliday));
  });

  it("gives a public holiday its own rate even when it lands on a weekend night", () => {
    // Labour Day 2026 is a Friday, so the night is both. The holiday is the
    // more specific reason and it wins, at the higher rate.
    const windows = derive("perak", "2026-05-01", "2026-05-10");
    expect(windows[0]).toMatchObject({
      from: "2026-05-01",
      to: "2026-05-01",
      label: "Labour Day",
      rateCents: peak(DEFAULT_PEAK_MULTIPLIERS.publicHoliday),
    });
  });

  it("prices the nights before a rest day, not the rest day itself", () => {
    // Nobody books Sunday night to be at work on Monday.
    const windows = derive("perak", "2026-10-01", "2026-10-31");
    const weekends = windows.filter((w) => w.label === "Weekend");
    const dow = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

    expect(weekends.length).toBeGreaterThan(0);
    for (const w of weekends) {
      expect(dow(w.from)).toBe(5); // Friday
      expect(dow(w.to)).toBe(6); // through Saturday
    }
  });

  it("moves the weekend with the state, not with Kuala Lumpur", () => {
    // Kelantan rests Friday–Saturday, so its weekend nights are Thursday and
    // Friday. Assuming Fri/Sat everywhere is the same KL bug as the school
    // holidays, and just as quiet.
    const kelantan = derive("kelantan", "2026-10-01", "2026-10-31").filter(
      (w) => w.label === "Weekend",
    );
    const dow = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();
    expect(kelantan.length).toBeGreaterThan(0);
    for (const w of kelantan) expect(dow(w.from)).toBe(4); // Thursday
  });

  it("does not invent windows for a year the snapshot does not cover", () => {
    expect(derive("perak", "2031-01-01", "2031-12-31")).toEqual([]);
  });

  it("returns nothing for a reversed range", () => {
    expect(derive("perak", "2026-06-30", "2026-06-01")).toEqual([]);
  });

  it("rounds a suggestion to the nearest ringgit", () => {
    const windows = deriveRateCalendar({
      state: "perak",
      baseRateCents: 28_333,
      from: "2026-05-01",
      to: "2026-05-01",
    });
    expect(windows[0]?.rateCents).toBe(34_000);
  });

  it("honours a multiplier the owner has adjusted", () => {
    const windows = deriveRateCalendar({
      state: "perak",
      baseRateCents: BASE,
      from: "2026-05-01",
      to: "2026-05-01",
      multipliers: { schoolHoliday: 1, publicHoliday: 2, weekend: 1 },
    });
    expect(windows[0]?.rateCents).toBe(50_000);
  });

  it("lets a merchant with one peak tier set them all the same", () => {
    // Pangkor is RM 550 normally and RM 650 on anything she calls 大日子 —
    // holidays, school breaks and weekends alike. One tier, not three.
    const windows = deriveRateCalendar({
      state: "perak",
      baseRateCents: 55_000,
      from: "2026-10-01",
      to: "2026-10-31",
      multipliers: { schoolHoliday: 650 / 550, publicHoliday: 650 / 550, weekend: 650 / 550 },
    });
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((w) => w.rateCents === 65_000)).toBe(true);
  });

  it("prices a replacement day, which is a working day turned into a holiday", () => {
    // Thaipusam falls on Sunday 2026-02-01 in Perak; the cuti ganti is Monday
    // the 2nd, and Monday is exactly the night that would otherwise be empty.
    const windows = derive("perak", "2026-02-02", "2026-02-02");
    expect(windows).toHaveLength(1);
    expect(windows[0]?.rateCents).toBe(peak(DEFAULT_PEAK_MULTIPLIERS.publicHoliday));
  });

  it("names both holidays when two share a day", () => {
    // Kuala Lumpur, 2026-02-01: Federal Territory Day and Thaipusam. The rate
    // moves once; the explanation should not drop one of the reasons.
    const windows = derive("kuala-lumpur", "2026-02-01", "2026-02-01");
    expect(windows).toHaveLength(1);
    expect(windows[0]?.label).toContain("Federal Territory Day");
    expect(windows[0]?.label).toContain("Thaipusam");
  });

  it("covers the federal territories, whose mycal codes are prefixed", () => {
    // `putrajaya` is `wp-putrajaya` upstream. Unmapped it matches nothing and
    // returns an empty calendar with no error at all.
    expect(derive("putrajaya", "2026-01-01", "2026-12-31").length).toBeGreaterThan(0);
    expect(derive("labuan", "2026-01-01", "2026-12-31").length).toBeGreaterThan(0);
  });
});
