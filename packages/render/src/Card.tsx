import { AbsoluteFill, CanvasImage, staticFile } from "remotion";
import { Caption, Footer } from "./Type";
import type { ShotPlan } from "./shot-plan";
import { CARD_HEIGHT, PAD } from "./theme";

/** Height of the photograph on the card. Leaves the caption a real panel. */
const PHOTO_HEIGHT = 900;

/**
 * The 图文 cover, in the same visual language as the reel and from the same
 * plan. One template, two aspect ratios — a merchant should not have to make
 * the same decision twice because two channels want different shapes.
 */
export function Card({ plan }: { plan: ShotPlan }) {
  const shot = plan.shots[0];
  if (!shot) throw new Error("shot plan is empty");

  return (
    <AbsoluteFill style={{ background: shot.panelColor }}>
      <div style={{ width: "100%", height: PHOTO_HEIGHT, overflow: "hidden" }}>
        <CanvasImage
          name="Photograph"
          src={staticFile(`photos/${shot.photo}`)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: PHOTO_HEIGHT,
          left: 0,
          right: 0,
          height: CARD_HEIGHT - PHOTO_HEIGHT - 140,
          display: "flex",
          alignItems: "center",
          padding: `0 ${PAD}px`,
        }}
      >
        <Caption
          eyebrow="整栋出租"
          headline={shot.headline}
          sub="邦咯岛 · 4 间房 · 每间自带卫浴 · 加床到 20 人"
        />
      </div>
      <Footer text={plan.footer} />
    </AbsoluteFill>
  );
}
