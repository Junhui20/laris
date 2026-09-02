import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { sans } from "./fonts";

/**
 * Type over the picture, bottom-anchored, and heavy.
 *
 * The first cut set this in a serif on a coloured panel with a progress bar and
 * a standing contact strip. Every one of those is a tell — the language of a
 * 2018 corporate explainer, not of anything anyone scrolls past today.
 *
 * **Nothing here animates `scale`, and that is not a style choice.** Driving
 * the headline's `scale` from `spring()` made the caption vanish entirely from
 * **every sixth frame** of a render — the period of Remotion's browser-tab
 * count. Bisected: a plain static caption is clean, the same animation with
 * `Interactive.Div` removed still flickers, and `interpolate` alone is clean.
 * The overshoot now comes from a back-out bezier on `translate` instead, which
 * gives the same snap and survives being rasterised by six tabs at once.
 */

/** Each line lands a beat after the one above. Frames, at 30fps. */
const IN = 13;
const STEP = 4;

/** Overshoots and settles — what the spring was there for. */
const SNAP = Easing.bezier(0.34, 1.42, 0.64, 1);
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export function Caption({
  headline,
  sub,
  tag,
  scale = 1,
  animate = true,
}: {
  headline: string;
  sub?: string | undefined;
  tag?: string | undefined;
  /** 16:9 is a wider, shorter frame; the same type would swamp it. */
  scale?: number;
  /** A still has no time: on frame 0 the entrance has not started. */
  animate?: boolean;
}) {
  const frame = useCurrentFrame();
  const at = animate ? frame : 30;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 14 * scale,
      }}
    >
      <Interactive.Div
        name="Headline"
        style={{
          opacity: interpolate(at, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          }),
          translate: interpolate(at, [0, IN], ["0px 46px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: SNAP,
          }),
          fontFamily: sans,
          fontSize: 92 * scale,
          fontWeight: 900,
          lineHeight: 1.14,
          letterSpacing: "-0.02em",
          color: "#FFFFFF",
          textShadow: "0 2px 24px rgba(0,0,0,0.45)",
          textWrap: "balance",
        }}
      >
        {headline}
      </Interactive.Div>

      {sub ? (
        <Interactive.Div
          name="Sub"
          style={{
            opacity: interpolate(at, [STEP * 2, STEP * 2 + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE,
            }),
            translate: interpolate(at, [STEP * 2, STEP * 2 + IN], ["0px 28px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SNAP,
            }),
            fontFamily: sans,
            fontSize: 40 * scale,
            fontWeight: 400,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
            whiteSpace: "pre-line",
          }}
        >
          {sub}
        </Interactive.Div>
      ) : null}

      {tag ? (
        <Interactive.Div
          name="CTA pill"
          style={{
            opacity: interpolate(at, [STEP * 3, STEP * 3 + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE,
            }),
            translate: interpolate(at, [STEP * 3, STEP * 3 + IN], ["0px 24px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SNAP,
            }),
            fontFamily: sans,
            fontSize: 42 * scale,
            fontWeight: 900,
            color: "#0F2028",
            backgroundColor: "#FFFFFF",
            borderRadius: 999,
            padding: `${16 * scale}px ${32 * scale}px`,
            marginTop: 10 * scale,
          }}
        >
          {tag}
        </Interactive.Div>
      ) : null}
    </div>
  );
}
