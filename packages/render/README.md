# `@laris/render`

Remotion compositions. Phase 02.

A **Business Profile** goes in, a **Shot Plan** comes out, and the compositions
draw the plan. Nothing in a composition reads a Profile, samples a photograph,
measures an audio file or decides what to say.

That split is not tidiness. It is the boundary phase 01 and phase 02 have to
hold anyway — perception produces data, the renderer draws it — and it makes the
interesting decisions reviewable: a wrong scene colour, or a line narrated over
a room that cannot show it, is a diff rather than something you find by watching
half a minute of video.

## Prerequisites

| | Why | Install |
|---|---|---|
| **ffprobe** | scene lengths are read from the audio files | ships with ffmpeg: `apt install ffmpeg`, `brew install ffmpeg`, `winget install Gyan.FFmpeg` |
| **Noto Sans CJK** | the typeface is subsetted from the system copy | `apt install fonts-noto-cjk fonts-noto-cjk-extra`, `brew install --cask font-noto-sans-cjk`, or [releases](https://github.com/notofonts/noto-cjk/releases); set `NOTO_CJK_DIR` if it is somewhere unusual |
| a **Chrome** | Remotion renders in a browser | optional — set `CHROME_PATH`, or let Remotion download its own Headless Shell (~113 MB, once) |

```bash
pnpm --filter @laris/render voice    # raw takes → trimmed, sped-up, level-matched
pnpm --filter @laris/render fonts    # subset the typeface to the glyphs in use
pnpm --filter @laris/render plan     # compile the Profile into src/shot-plan.json
pnpm --filter @laris/render render   # out/*.mp4, out/listing-card.jpeg
pnpm --filter @laris/render studio   # Remotion Studio, for iterating on a scene
```

`render` takes an optional composition id, and `REMOTION_GL`,
`REMOTION_CONCURRENCY` and `REMOTION_FRAMES` for debugging.

## The Profile is read, not retyped

`scripts/build-plan.ts` imports the Business Profile and hands it to
`readFacts`, which pulls every on-screen number out of it — from schema fields
where the schema has them, and from the offering's own prose where it does not.
**A claim the Profile no longer supports throws.** Editorial phrasing is
authored; factual claims are interpolated.

```
headline: (f) => `${f.bedrooms} 间房，${f.bedrooms} 个厕所`
```

`src/profile-facts.test.ts` mutates the Profile and asserts both halves: change
the bedroom count and the plan changes; delete the sentence that says every
bedroom has its own bathroom and the build refuses.

The compiler is TypeScript because the Profile is, so `pnpm plan` bundles it
with esbuild first (`scripts/run-ts.mjs`). Until #3 lands, the Profile is the
committed fixture; when the repository can read one, that import becomes a
lookup by slug and nothing below it changes.

## Three shapes, one plan

| Composition | Size | For |
|---|---|---|
| `ListingReel` | 1080×1920 | TikTok, Reels, Shorts — where a homestay gets discovered |
| `ListingWide` | 1920×1080 | Merchant Site hero, Facebook page, YouTube |
| `ListingCard` | 1080×1350 | the 图文 post cover |

16:9 is not an afterthought: **every one of these photographs is landscape or
3:4**, so it is the shape the material was taken in. 9:16 is where the reach is.
Both come off one plan.

## A scene is a line of narration

`durationMs` comes from the length of its audio file, not from a number someone
picked, and the photographs inside a scene share that length. **The picture cuts
faster than the voice** — one photograph per sentence is a slideshow, and a test
asserts the average shot stays under 3.5s.

Motion is `pan-x`, `pan-y` or `punch`. Panning is what lets a landscape room
live in a 9:16 frame: a static crop throws most of it away, a pan gives it back
over the length of the shot.

Images are sized explicitly (`118%`, offset `-9%`) rather than scaled.
`objectFit: "cover"` combined with a CSS `scale` did not compose as expected on
a 3:4 photograph in a 9:16 frame — it fitted to width, scaled that, and left
110 px of composition background top and bottom.

**Nothing animates `scale`.** Driving the caption's scale from `spring()` made
it vanish from every sixth frame of a render — the period of Remotion's
browser-tab count. The overshoot comes from a back-out bezier on `translate`
instead. See the comment in `src/Caption.tsx`.

## Colour comes from the house

`color` is sampled per scene: the most saturated colour the photograph actually
contains, **weighted by how much of the frame it covers**, taken down to a tone
white type sits on. Averaging returns mud — every room here averages to grey
floor tile — and saturation alone picks the yellow front door, which covers one
percent of two frames.

## Sound

`public/vo/raw/*.mp3` are the takes as the TTS API returned them, and are
committed. `pnpm voice` trims, speeds up and level-matches them into
`public/vo/`, which is generated. Delivery speed is a constant in that script,
so changing how fast the voice reads is a diff rather than eight more paid
generations.

There is **no music**, and no track is committed. `src/MusicBed.tsx` ducks a bed
against the edit — 9% while a line speaks, 34% between them, computed from
`speechMs` rather than detected from the signal. Drop a licensed file at
`public/music/bed.mp3`, run `pnpm plan`, and it appears.

See [PROVENANCE.md](./PROVENANCE.md) for where the typeface and the narration
came from and on what terms. **Commercial-use clearance for the synthesised
voice is not established** — it is a stand-in while the edit is judged.

## Known debt

- The scene list is authored in `scripts/build-plan.ts`. Phase 02 generates it;
  this package is the renderer, not the planner.
- No automated render smoke test. `pnpm render ListingCard` is the manual one.
