import { loadFont } from "@remotion/fonts";
import { cancelRender, continueRender, delayRender } from "remotion";
import { WOFF2 } from "./font-data";

/**
 * The typeface, inlined.
 *
 * The road here is worth writing down, because every step of it looked like the
 * answer and only the last one was.
 *
 * Every sixth frame of a render came out with **no caption on it** — the period
 * of Remotion's browser-tab count, and `REMOTION_CONCURRENCY=1` made it vanish.
 * That named it a rendering race rather than an animation bug. It survived
 * using the family name the loader actually registers; it survived dropping
 * `Interactive.Div`; it survived subsetting the font to 136 glyphs and serving
 * it from `public/`; it survived `delayRender`. A three-frame comparison at
 * full resolution settled what was actually happening: the photograph is
 * identical across the frames either side, and only the text disappears.
 *
 * So the font is inlined. Whatever the tab is racing with — the static file
 * server, its own font pipeline — a face that is already inside the bundle
 * cannot lose that race.
 *
 * `pnpm fonts` regenerates `font-data.ts` from the system Noto Sans CJK. A test
 * asserts the subset still covers every character the plan puts on screen.
 */
export const FONT_FAMILY = "Noto Sans SC Subset";
export const sans = `"${FONT_FAMILY}", system-ui, sans-serif`;

const handle = delayRender("registering the inlined typeface");

Promise.all(
  (["400", "900"] as const).map((weight) =>
    loadFont({ family: FONT_FAMILY, url: WOFF2[weight], weight, format: "woff2" }),
  ),
)
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
