import { AbsoluteFill, CanvasImage, staticFile, useVideoConfig } from "remotion";
import { Caption } from "./Caption";
import type { ShotPlan } from "./shot-plan";

/**
 * The 图文 cover, from the same plan and the same components. One template, two
 * shapes — a merchant should not make the same decision twice because two
 * channels want different aspect ratios.
 *
 * The copy comes from `plan.card`. It used to be three facts typed into this
 * file — "15 个人", "4 间房", "加床到 20 人" — which meant an edit to the
 * Business Profile left a valid-looking, stale cover behind and nothing said so.
 */
export function Card({ plan }: { plan: ShotPlan }) {
  const { width, height } = useVideoConfig();
  const scene = plan.scenes[0];
  const opening = scene?.frames[0];
  if (!scene || !opening) throw new Error("shot plan is empty");

  return (
    <AbsoluteFill style={{ backgroundColor: scene.color }}>
      <CanvasImage
        name="Photograph"
        src={staticFile(`photos/${opening.photo}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <AbsoluteFill
        style={{ background: `linear-gradient(to bottom, transparent 38%, ${scene.color}F2 90%)` }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: `0 ${Math.round(width * 0.075)}px ${Math.round(height * 0.07)}px`,
        }}
      >
        <Caption headline={plan.card.headline} sub={plan.card.sub} animate={false} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
