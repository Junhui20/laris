import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ShotPlan } from "./shot-plan.js";
import planJson from "./shot-plan.json";

const here = dirname(fileURLToPath(import.meta.url));
const photos = join(here, "../../api/public/m/pangkor-my-homestay");

/**
 * The plan is generated and committed, which is the point — a wrong panel
 * colour or a mis-ordered shot should be a line in a diff rather than something
 * you find by watching twenty seconds of video. That only works if the
 * committed file is checked.
 */
describe("the committed shot plan", () => {
  const plan = ShotPlan.parse(planJson);

  it("parses against its own schema", () => {
    expect(plan.shots.length).toBeGreaterThan(0);
  });

  it("names photographs that exist in the Merchant's own assets", () => {
    // `public/photos/` here is a copy made by `pnpm plan` and is gitignored;
    // the originals live with the Merchant, and that is what must resolve on a
    // fresh clone.
    for (const shot of plan.shots) {
      expect(existsSync(join(photos, shot.photo)), shot.photo).toBe(true);
    }
  });

  it("gives every shot a colour dark enough for white type", () => {
    for (const { panelColor, photo } of plan.shots) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(panelColor.slice(i, i + 2), 16));
      const luminance = (0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)) / 255;
      expect(luminance, `${photo} ${panelColor}`).toBeLessThan(0.4);
    }
  });

  it("opens on the hook and closes on the call to action", () => {
    expect(plan.shots[0]?.headline).toContain("15 个人");
    expect(plan.shots.at(-1)?.tag).toBeDefined();
  });
});
