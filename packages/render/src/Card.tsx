import { AbsoluteFill, CanvasImage, staticFile, useVideoConfig } from "remotion";
import { Caption } from "./Caption";
import type { ShotPlan } from "./shot-plan";

/**
 * The 图文 cover, from the same plan and the same components. One template, two
 * shapes — a merchant should not make the same decision twice because two
 * channels want different aspect ratios.
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
        <Caption
          headline="15 个人，住一整栋"
          sub={`邦咯岛 · 4 间房，每间自带卫浴 · 加床到 20 人\n${plan.contact}`}
          animate={false}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
