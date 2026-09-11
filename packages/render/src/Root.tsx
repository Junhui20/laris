import { Composition } from "remotion";
import { Card } from "./Card";
// Imported for its side effect: registers the typeface before the first frame.
import "./fonts";
import { Story, storyFrames } from "./Story";
import { ShotPlan } from "./shot-plan";
import planJson from "./shot-plan.json";
import { CARD, CARD_FRAMES, FPS, REEL, WIDE } from "./theme";

// Parsed, not cast. The plan is generated, and a generated file that has drifted
// from its schema should fail here rather than render as a blank.
const plan = ShotPlan.parse(planJson);

export function RemotionRoot() {
  return (
    <>
      {/* TikTok, Reels, Shorts — where a homestay actually gets discovered. */}
      <Composition
        id="ListingReel"
        component={Story}
        durationInFrames={storyFrames(plan, FPS)}
        fps={FPS}
        {...REEL}
        defaultProps={{ plan, typeScale: 1 }}
      />
      {/* 16:9, for the Merchant Site hero, the Facebook page and YouTube. Every
          one of these photographs is landscape or 3:4, so this is the shape the
          material was actually taken in. */}
      <Composition
        id="ListingWide"
        component={Story}
        durationInFrames={storyFrames(plan, FPS)}
        fps={FPS}
        {...WIDE}
        defaultProps={{ plan, typeScale: 0.62 }}
      />
      <Composition
        id="ListingCard"
        component={Card}
        durationInFrames={CARD_FRAMES}
        fps={FPS}
        {...CARD}
        defaultProps={{ plan }}
      />
    </>
  );
}
