import { loadFont as loadSans } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSerif } from "@remotion/google-fonts/NotoSerifSC";
import { Composition } from "remotion";
import { Card } from "./Card";
import { Reel, reelFrames } from "./Reel";
import { ShotPlan } from "./shot-plan";
import planJson from "./shot-plan.json";
import { CARD_FRAMES, CARD_HEIGHT, CARD_WIDTH, FPS, HEIGHT, WIDTH } from "./theme";

// Loaded at module scope so Remotion has the faces before the first frame.
//
// Both are asked for exactly two weights and two subsets. Left at their
// defaults, a CJK family fetches every subset it has — 909 requests for Noto
// Sans SC alone, per browser tab, on every render.
//
// TODO: subset these to the glyphs the plan actually uses and commit them.
// Google Fonts means the render reaches the network, which is fine on a laptop
// and wrong in CI.
const WEIGHTS = ["400", "700"] as const;
const SUBSETS = ["chinese-simplified", "latin"] as const;

loadSans("normal", { weights: [...WEIGHTS], subsets: [...SUBSETS] });
loadSerif("normal", { weights: [...WEIGHTS], subsets: [...SUBSETS] });

// Parsed, not cast. The plan is generated, and a generated file that has
// drifted from its schema should fail here rather than render as a blank.
const plan = ShotPlan.parse(planJson);

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="ListingReel"
        component={Reel}
        durationInFrames={reelFrames(plan, FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ plan }}
      />
      <Composition
        id="ListingCard"
        component={Card}
        durationInFrames={CARD_FRAMES}
        fps={FPS}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        defaultProps={{ plan }}
      />
    </>
  );
}
