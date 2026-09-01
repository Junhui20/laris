import type { BusinessContext, Photo } from "@laris/schema";
import { describe, expect, it } from "vitest";
import { pangkorMyHomestay } from "../fixtures/pangkor-my-homestay.js";
import { rumahOmbak } from "../fixtures/rumah-ombak.js";
import { StaySite } from "./render.js";

const ORIGIN = "https://example.test";
const html = (ctx: BusinessContext) => String(StaySite({ ctx, siteUrl: `${ORIGIN}/site/x` }));
const count = (haystack: string, needle: RegExp) => haystack.match(needle)?.length ?? 0;

const photo = (key: string, alt: string): Photo => ({
  key,
  width: 1000,
  height: 800,
  widths: [500, 1000],
  alt,
});

describe("photo slots", () => {
  it("shows every brief when there are no photographs", () => {
    const page = html(rumahOmbak);
    expect(count(page, /<img/g)).toBe(0);
    expect(page).toContain("客厅 · 自然光，广角");
    expect(page).toContain("屋外街景 · 傍晚");
  });

  it("keeps the briefs that photographs have not covered yet", () => {
    // The briefs are a checklist of shots still to take, so the first upload
    // must not sweep the rest away.
    const ctx: BusinessContext = {
      ...rumahOmbak,
      photos: [photo("x/a", "one"), photo("x/b", "two")],
    };
    const page = html(ctx);
    // One photograph for the hero, one in the strip, then the three strip
    // briefs still unfilled plus one on each of the two unphotographed rooms.
    expect(count(page, /<img/g)).toBe(2);
    expect(count(page, /class="brief"/g)).toBe(5);
    expect(page).toContain("厨房 · 干净的台面细节");
    expect(page).toContain("屋外街景 · 傍晚");
  });

  it("reaches every photograph an offering carries", () => {
    // Only room.photos[0] used to be rendered; the rest were stored and never
    // shown, which is the same as losing them.
    const page = html(pangkorMyHomestay);
    for (const p of pangkorMyHomestay.photos) expect(page).toContain(p.key);
    for (const offering of pangkorMyHomestay.offerings) {
      if (offering.kind !== "room_type") continue;
      for (const p of offering.photos) expect(page).toContain(p.key);
    }
  });

  it("emits intrinsic size and every stored variant", () => {
    const ctx: BusinessContext = { ...rumahOmbak, photos: [photo("x/a", "one")] };
    const page = html(ctx);
    expect(page).toContain(`${ORIGIN}/m/x/a-1000.jpg`);
    expect(page).toContain(`${ORIGIN}/m/x/a-500.jpg 500w`);
    expect(page).toContain('width="1000"');
    expect(page).toContain('height="800"');
  });
});

describe("what the page will not claim", () => {
  it("does not turn a whole house into one room", () => {
    const page = html(pangkorMyHomestay);
    expect(page).not.toContain("1 间房");
    expect(page).toContain("整栋出租 · 4 间房，睡 15 人");
  });

  it("names no price when the merchant quotes on enquiry", () => {
    const page = html(pangkorMyHomestay);
    const body = page.replace(/<script[\s\S]*?<\/script>/g, "");
    // RM 20 for an extra bed is a number she does state, and stays.
    expect(body).not.toMatch(/RM \d+<\/b>/);
    expect(body).not.toContain("起 / 晚");
  });

  it("stays quiet about check-in times nobody has confirmed", () => {
    const page = html(pangkorMyHomestay);
    expect(page).not.toContain("入住 15:00");
    expect(page).toContain("最少 1 晚");
  });

  it("still prices a merchant that has a rate card", () => {
    const page = html(rumahOmbak);
    expect(page).toContain("起 / 晚");
  });
});
