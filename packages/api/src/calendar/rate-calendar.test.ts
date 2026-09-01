import { describe, expect, it } from "vitest";
import { DEFAULT_PEAK_MULTIPLIERS, deriveRateCalendar } from "./rate-calendar.js";

const BASE = 25_000;

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
    // The owner should be asked to approve one window, not five.
    expect(midYear).toHaveLength(1);
    expect(midYear[0]).toMatchObject({ from: "2026-05-23", to: "2026-06-07" });
    expect(midYear[0]?.rateCents).toBe(BASE * DEFAULT_PEAK_MULTIPLIERS.schoolHoliday);
  });

  it("gives a public holiday standing on its own the public-holiday rate", () => {
    const windows = derive("perak", "2026-05-01", "2026-05-10");
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      from: "2026-05-01",
      to: "2026-05-01",
      label: "Labour Day",
      rateCents: BASE * DEFAULT_PEAK_MULTIPLIERS.publicHoliday,
    });
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
    expect(windows[0]?.rateCents).toBe(39_700);
  });

  it("honours a multiplier the owner has adjusted", () => {
    const windows = deriveRateCalendar({
      state: "perak",
      baseRateCents: BASE,
      from: "2026-05-01",
      to: "2026-05-01",
      multipliers: { schoolHoliday: 1, publicHoliday: 2 },
    });
    expect(windows[0]?.rateCents).toBe(50_000);
  });

  it("covers the federal territories, whose mycal codes are prefixed", () => {
    // `putrajaya` is `wp-putrajaya` upstream. Unmapped it matches nothing and
    // returns an empty calendar with no error at all.
    expect(derive("putrajaya", "2026-01-01", "2026-12-31").length).toBeGreaterThan(0);
    expect(derive("labuan", "2026-01-01", "2026-12-31").length).toBeGreaterThan(0);
  });
});
