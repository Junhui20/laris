import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Shot } from "./Shot";
import type { ShotPlan } from "./shot-plan";

/** Hard cuts. A dip to black on a 2.3-second shot spends a tenth of the reel on nothing. */
export function Reel({ plan }: { plan: ShotPlan }) {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  let from = 0;
  return (
    <>
      {plan.shots.map((shot, i) => {
        const length = Math.round((shot.durationMs / 1000) * fps);
        const start = from;
        from += length;
        return (
          <Sequence key={`${shot.photo}-${i}`} from={start} durationInFrames={length}>
            <Shot shot={shot} footer={plan.footer} progress={frame / durationInFrames} />
          </Sequence>
        );
      })}
    </>
  );
}

export function reelFrames(plan: ShotPlan, fps: number): number {
  return plan.shots.reduce((n, s) => n + Math.round((s.durationMs / 1000) * fps), 0);
}
