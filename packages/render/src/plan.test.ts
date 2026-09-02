import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ShotPlan } from "./shot-plan.js";
import planJson from "./shot-plan.json";

const here = dirname(fileURLToPath(import.meta.url));
const photos = join(here, "../../api/public/m/pangkor-my-homestay");
const vo = join(here, "../public/vo");

/**
 * The plan is generated and committed, which is the point — a wrong scene
 * colour or a line pointing at the wrong room should be a diff, not something
 * you find by watching thirty seconds of video. That only works if the
 * committed file is checked.
 */
describe("the committed shot plan", () => {
  const plan = ShotPlan.parse(planJson);
  const frames = plan.scenes.flatMap((s) => s.frames);

  it("parses against its own schema", () => {
    expect(plan.scenes.length).toBeGreaterThan(0);
  });

  it("names photographs that exist in the Merchant's own assets", () => {
    // `public/photos/` here is a copy made by `pnpm plan` and is gitignored;
    // the originals live with the Merchant, and that is what must resolve on a
    // fresh clone.
    for (const frame of frames) {
      expect(existsSync(join(photos, frame.photo)), frame.photo).toBe(true);
    }
  });

  it("has an audio file for every scene that claims one", () => {
    for (const scene of plan.scenes) {
      if (!scene.audio) continue;
      const file = join(vo, scene.audio.replace(/^vo\//, ""));
      expect(existsSync(file), scene.audio).toBe(true);
    }
  });

  it("gives every scene a colour dark enough for white type", () => {
    for (const { color, headline } of plan.scenes) {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));
      const luminance = (0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)) / 255;
      expect(luminance, `${headline} ${color}`).toBeLessThan(0.4);
    }
  });

  it("cuts the picture faster than the voice", () => {
    // One photograph per sentence is a slideshow. Whatever else changes, the
    // average shot should stay under three seconds.
    const total = plan.scenes.reduce((n, s) => n + s.durationMs, 0);
    expect(total / frames.length).toBeLessThan(3000);
  });

  it("never says something the picture cannot show", () => {
    // The kitchen and barbecue line was recorded and dropped: there is no
    // photograph of either, and narrating it over a bedroom is how "walk 13
    // minutes to the beach" ended up over the car porch in the first cut.
    const spoken = plan.scenes.map((s) => s.spoken).join(" ");
    expect(spoken).not.toMatch(/厨房|烧烤/);
  });

  it("opens on the hook and closes on the call to action", () => {
    expect(plan.scenes[0]?.headline).toBe("最怕分开住");
    expect(plan.scenes.at(-1)?.tag).toBeDefined();
    expect(plan.scenes.at(-1)?.sub).toContain(plan.contact);
  });
});
