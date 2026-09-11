import { Audio } from "@remotion/media";
import { interpolate, staticFile, useVideoConfig } from "remotion";
import type { ShotPlan } from "./shot-plan";

/** How loud the bed sits between lines, and how far it drops under a voice. */
const OPEN = 0.34;
const DUCKED = 0.09;
/** Frames to fall and to recover. Fast in, slow out, the way a compressor behaves. */
const ATTACK = 5;
const RELEASE = 12;

/**
 * A music bed that gets out of the way of the narration.
 *
 * Remotion takes `volume` as a function of frame, and the plan already knows
 * exactly when each line speaks — `speechMs` is the voice, `durationMs` adds
 * the tail of silence after it. So the duck is computed from the edit rather
 * than detected from the signal, which is both more accurate and reviewable.
 *
 * There is no track committed. Borrowing one is how a merchant collects a
 * copyright claim on their own listing, so `music` only appears in the plan
 * once a licensed file is actually at `public/music/bed.mp3`.
 */
export function MusicBed({ plan }: { plan: ShotPlan }) {
  const { fps, durationInFrames } = useVideoConfig();
  if (!plan.music) return null;

  const ms = (n: number) => Math.round((n / 1000) * fps);
  const spans: [number, number][] = [];
  let at = 0;
  for (const scene of plan.scenes) {
    if (scene.audio && scene.speechMs > 0) spans.push([at, at + ms(scene.speechMs)]);
    at += ms(scene.durationMs);
  }

  const volume = (frame: number) => {
    let level = OPEN;
    for (const [from, to] of spans) {
      if (frame >= from - ATTACK && frame <= to + RELEASE) {
        const down = interpolate(frame, [from - ATTACK, from], [OPEN, DUCKED], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const up = interpolate(frame, [to, to + RELEASE], [DUCKED, OPEN], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        level = Math.min(level, frame <= from ? down : up);
      }
    }
    // Fade the whole bed in and out so it does not start or stop on a cut.
    const edges = Math.min(
      interpolate(frame, [0, fps], [0, 1], { extrapolateRight: "clamp" }),
      interpolate(frame, [durationInFrames - fps, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
      }),
    );
    return level * edges;
  };

  return <Audio src={staticFile(plan.music)} volume={volume} loop />;
}
