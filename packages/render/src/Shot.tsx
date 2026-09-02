import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption, Footer } from "./Type";
import type { Shot as ShotType } from "./shot-plan";
import { HEIGHT, PAD, PHOTO_SIZE, WIDTH } from "./theme";

/**
 * One shot, in one of two layouts.
 *
 * The two exist because of a fact about this merchant, not a taste: she has no
 * vertical photographs. A 3:4 frame survives a 9:16 crop and fills the screen;
 * anything wider loses most of the room, so it is cropped square, takes the top
 * of the frame, and the caption sits on a panel below in the room's own colour.
 * The first attempt blurred a copy of the photograph behind itself to fill the
 * gap, which is what every automatic listing video looks like.
 */
export function Shot({
  shot,
  footer,
  progress,
}: {
  shot: ShotType;
  footer: string;
  progress: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const last = Math.max(Math.round((shot.durationMs / 1000) * fps) - 1, 1);
  const src = staticFile(`photos/${shot.photo}`);

  if (shot.layout === "full-bleed") {
    return (
      <AbsoluteFill style={{ backgroundColor: shot.panelColor }}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <CanvasImage
            name="Photograph"
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              scale: interpolate(frame, [0, last], [1, 1.06], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                output: "perceptual-scale",
              }),
            }}
          />
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, transparent 38%, ${shot.panelColor} 88%)`,
          }}
        />
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: `0 ${PAD}px 250px` }}>
          <Caption eyebrow={shot.eyebrow} headline={shot.headline} sub={shot.sub} tag={shot.tag} />
        </AbsoluteFill>
        <Footer text={footer} />
        <Progress value={progress} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: shot.panelColor }}>
      <div style={{ width: WIDTH, height: PHOTO_SIZE, overflow: "hidden" }}>
        <CanvasImage
          name="Photograph"
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: interpolate(frame, [0, last], [1, 1.06], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: PHOTO_SIZE,
          left: 0,
          right: 0,
          height: HEIGHT - PHOTO_SIZE - 150,
          display: "flex",
          alignItems: "center",
          padding: `0 ${PAD}px`,
        }}
      >
        <Caption eyebrow={shot.eyebrow} headline={shot.headline} sub={shot.sub} tag={shot.tag} />
      </div>
      <Footer text={footer} />
      <Progress value={progress} />
    </AbsoluteFill>
  );
}

/** How much is left. Standard on a listing reel, and it works. */
function Progress({ value }: { value: number }) {
  return (
    <Interactive.Div
      name="Progress"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: "rgba(255,255,255,0.26)",
      }}
    >
      <div
        style={{
          width: `${value * 100}%`,
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.95)",
        }}
      />
    </Interactive.Div>
  );
}
