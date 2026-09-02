import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Caption } from "./Caption";
import { Frame } from "./Frame";
import type { ShotPlan } from "./shot-plan";

/**
 * The reel, at whatever size the composition is.
 *
 * One Sequence per narration line, sized to its audio file rather than to a
 * number someone picked — and the photographs inside it cut faster than the
 * voice. That is the difference between an edit and a slideshow, and it is why
 * the plan is built around scenes rather than shots.
 */
export function Story({ plan, typeScale = 1 }: { plan: ShotPlan; typeScale?: number }) {
  const { fps, width, height } = useVideoConfig();

  // Horizontal room comes from the width, vertical from the height. Deriving
  // both from one dimension makes 16:9 cramped at the sides and 9:16 cramped
  // at the bottom.
  const padX = Math.round(width * 0.055);
  const padY = Math.round(height * 0.07);
  // A short frame needs the scrim to start lower, or the whole picture greys.
  const scrimStart = width > height ? 55 : 42;

  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1418" }}>
      {plan.scenes.map((scene, i) => {
        const length = Math.round((scene.durationMs / 1000) * fps);
        const start = from;
        from += length;
        const per = Math.floor(length / scene.frames.length);

        return (
          <Sequence
            key={`${scene.headline}-${i}`}
            name={scene.headline}
            from={start}
            durationInFrames={length}
          >
            {scene.frames.map((shot, j) => (
              <Sequence
                key={`${shot.photo}-${j}`}
                from={j * per}
                durationInFrames={j === scene.frames.length - 1 ? length - j * per : per}
              >
                <AbsoluteFill style={{ overflow: "hidden" }}>
                  <Frame
                    frame={shot}
                    durationInFrames={j === scene.frames.length - 1 ? length - j * per : per}
                  />
                </AbsoluteFill>
              </Sequence>
            ))}

            {/* Scrim in the scene's own colour, so the type holds without a panel. */}
            <AbsoluteFill
              style={{
                background: `linear-gradient(to bottom, transparent ${scrimStart}%, ${scene.color}F2 94%)`,
              }}
            />

            <AbsoluteFill
              style={{
                justifyContent: "flex-end",
                padding: `0 ${padX}px ${padY}px`,
              }}
            >
              <Caption
                headline={scene.headline}
                sub={scene.sub}
                tag={scene.tag}
                scale={typeScale}
              />
            </AbsoluteFill>

            {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

export function storyFrames(plan: ShotPlan, fps: number): number {
  return plan.scenes.reduce((n, s) => n + Math.round((s.durationMs / 1000) * fps), 0);
}
