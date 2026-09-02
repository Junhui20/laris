import {
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SANS = '"Noto Sans SC", system-ui, sans-serif';

/**
 * Type over the picture, bottom-anchored, and heavy.
 *
 * The first cut set this in a serif on a coloured panel with a progress bar and
 * a standing contact strip. Every one of those is a tell: it is the language of
 * a 2018 corporate explainer, not of something anyone scrolls past today. The
 * caption now sits on the photograph, weighs 900, and arrives with an
 * overshoot instead of a fade.
 */
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
  animate?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(at, [0, 12], ["0px 40px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: spring({
            frame: at,
            fps,
            config: { damping: 14, mass: 0.5 },
            durationInFrames: 18,
          }),
          transformOrigin: "left bottom",
          fontFamily: SANS,
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
            opacity: interpolate(at, [6, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(at, [6, 18], ["0px 24px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            fontFamily: SANS,
            fontSize: 40 * scale,
            fontWeight: 400,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}
        >
          {sub}
        </Interactive.Div>
      ) : null}

      {tag ? (
        <Interactive.Div
          name="CTA pill"
          style={{
            opacity: interpolate(at, [14, 24], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            scale: spring({
              frame: Math.max(at - 14, 0),
              fps,
              config: { damping: 12, mass: 0.4 },
              durationInFrames: 18,
            }),
            transformOrigin: "left center",
            fontFamily: SANS,
            fontSize: 42 * scale,
            fontWeight: 700,
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
