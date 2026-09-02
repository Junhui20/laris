import { CanvasImage, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Frame as FrameType } from "./shot-plan";

/**
 * One photograph, moving.
 *
 * The merchant has no vertical footage, so a 9:16 crop of a landscape room
 * throws most of it away. Panning across the crop gives the whole photograph
 * back over the length of the shot — and a frame that moves is the difference
 * between a cut and a slideshow. The first version cropped square and sat the
 * caption on a coloured panel underneath, which is legible, tidy, and looks
 * like corporate video from 2018.
 */
export function Frame({
  frame: shot,
  durationInFrames,
}: { frame: FrameType; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const last = Math.max(durationInFrames - 1, 1);
  const src = staticFile(`photos/${shot.photo}`);
  const dir = shot.reverse ? -1 : 1;

  if (shot.motion === "punch") {
    return (
      <CanvasImage
        name="Photograph"
        src={src}
        style={{
          position: "absolute",
          left: "-9%",
          top: "-9%",
          width: "118%",
          height: "118%",
          objectFit: "cover",
          scale: interpolate(frame, [0, last], [1.06, 0.94], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      />
    );
  }

  // Sized explicitly rather than scaled. `objectFit: "cover"` combined with a
  // CSS `scale` did not compose as expected on a 3:4 photograph in a 9:16
  // frame — it fitted to width, scaled that, and left 110px of composition
  // background top and bottom. Overfilling by a known amount and translating
  // inside it has no such interaction.
  const travelX = shot.motion === "pan-x" ? 6 : 0;
  const travelY = shot.motion === "pan-y" ? 6 : 0;

  return (
    <CanvasImage
      name="Photograph"
      src={src}
      style={{
        position: "absolute",
        left: "-9%",
        top: "-9%",
        width: "118%",
        height: "118%",
        objectFit: "cover",
        translate: interpolate(
          frame,
          [0, last],
          [`${-dir * travelX}% ${-dir * travelY}%`, `${dir * travelX}% ${dir * travelY}%`],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.33, 0, 0.4, 1),
          },
        ),
      }}
    />
  );
}
