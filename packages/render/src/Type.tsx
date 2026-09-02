import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";

/**
 * Styles are written inline, as plain objects with the `interpolate()` calls in
 * place, because that is what lets Remotion Studio recognise them: keyframes and
 * easing stay editable instead of greying out. Pulling them into a theme module
 * reads tidier and costs the only tool we have for iterating on a template.
 *
 * That is not a contradiction of "the owner never sees a timeline" — Studio is
 * ours, not theirs. The merchant sees an approved post.
 */

const SANS = '"Noto Sans SC", system-ui, sans-serif';
const SERIF = '"Noto Serif SC", Georgia, serif';

/** Each line lands a beat after the one above. Frames, at 30fps. */
const IN = 13;
const STEP = 4;

export function Caption({
  eyebrow,
  headline,
  sub,
  tag,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  tag?: string | undefined;
}) {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <Interactive.Div
        name="Eyebrow"
        style={{
          opacity: interpolate(frame, [0, IN], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [0, IN], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          fontFamily: SANS,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "0.34em",
          color: "rgba(255,255,255,0.70)",
          marginBottom: 22,
        }}
      >
        {eyebrow}
      </Interactive.Div>

      <Interactive.Div
        name="Headline"
        style={{
          opacity: interpolate(frame, [STEP, STEP + IN], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [STEP, STEP + IN], ["0px 24px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          fontFamily: SERIF,
          fontSize: 78,
          fontWeight: 700,
          lineHeight: 1.3,
          color: "#FFFFFF",
          textWrap: "balance",
        }}
      >
        {headline}
      </Interactive.Div>

      <Interactive.Div
        name="Sub"
        style={{
          opacity: interpolate(frame, [STEP * 2, STEP * 2 + IN], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [STEP * 2, STEP * 2 + IN], ["0px 20px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          fontFamily: SANS,
          fontSize: 40,
          lineHeight: 1.4,
          color: "rgba(255,255,255,0.84)",
          marginTop: 10,
        }}
      >
        {sub}
      </Interactive.Div>

      {tag ? (
        <Interactive.Div
          name="CTA pill"
          style={{
            opacity: interpolate(frame, [STEP * 3, STEP * 3 + IN], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            scale: interpolate(frame, [STEP * 3, STEP * 3 + IN], [0.92, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
            fontFamily: SANS,
            fontSize: 42,
            fontWeight: 700,
            color: "#142834",
            background: "#FFFFFF",
            borderRadius: 999,
            padding: "16px 30px",
            marginTop: 30,
          }}
        >
          {tag}
        </Interactive.Div>
      ) : null}
    </div>
  );
}

/** A listing video gets screenshotted. The number has to survive that. */
export function Footer({ text }: { text: string }) {
  return (
    <Interactive.Div
      name="Footer"
      style={{ position: "absolute", left: 84, right: 84, bottom: 56 }}
    >
      <div style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 28 }} />
      <div style={{ fontFamily: SANS, fontSize: 30, color: "rgba(255,255,255,0.60)" }}>{text}</div>
    </Interactive.Div>
  );
}
