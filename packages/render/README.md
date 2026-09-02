# `@laris/render`

Remotion compositions. Phase 02.

A Business Profile goes in, a **Shot Plan** comes out, and the compositions draw
the plan. Nothing in a composition reads a Profile, samples a photograph,
measures an audio file or decides what to say — that happens once in
`scripts/build-plan.mjs` and lands in `src/shot-plan.json`.

That split is not tidiness. It is the boundary phase 01 and phase 02 have to
hold anyway (perception produces data, the renderer draws it), and it makes the
interesting decisions reviewable: a wrong scene colour, or a line narrated over
a room that cannot show it, is a diff rather than something you find by watching
thirty seconds of video.

```bash
pnpm --filter @laris/render plan     # compile the plan, copy the photographs
pnpm --filter @laris/render render   # out/*.mp4, out/listing-card.jpeg
pnpm --filter @laris/render studio   # Remotion Studio, for iterating on a scene
```

## Three shapes, one plan

| Composition | Size | For |
|---|---|---|
| `ListingReel` | 1080×1920 | TikTok, Reels, Shorts — where a homestay gets discovered |
| `ListingWide` | 1920×1080 | Merchant Site hero, Facebook page, YouTube |
| `ListingCard` | 1080×1350 | the 图文 post cover |

16:9 is not an afterthought here: **every one of these photographs is landscape
or 3:4**, so it is the shape the material was actually taken in. 9:16 is where
the reach is. Rendering both from one plan costs one `<Composition>`.

## A scene is a line of narration

`durationMs` comes from the length of its audio file, not from a number someone
picked, and the photographs inside a scene share that length. **The picture cuts
faster than the voice** — one photograph per sentence is a slideshow, and a test
asserts the average shot stays under three seconds.

Motion is `pan-x`, `pan-y` or `punch`. Panning is what lets a landscape room
live in a 9:16 frame: a static crop throws most of it away, a pan gives it back
over the length of the shot.

The images are sized explicitly (`118%`, offset `-9%`) rather than scaled.
`objectFit: "cover"` combined with a CSS `scale` did not compose as expected on
a 3:4 photograph in a 9:16 frame — it fitted to width, scaled that, and left
110 px of composition background top and bottom.

## Colour comes from the house

`color` is sampled per scene: the most saturated colour the photograph actually
contains, **weighted by how much of the frame it covers**, taken down to a tone
white type sits on.

Both halves matter. Averaging returns mud — every room here averages to grey
floor tile. Saturation alone picks the yellow front door, which covers one
percent of two frames and turns a blue-sky scrim olive.

## Voiceover

`public/vo/line-*.mp3` — Mandarin TTS, silence-trimmed and loudness-normalised
to −16 LUFS. The plan reads their durations, so re-recording a line re-times the
cut for free.

One line was recorded and **not** used: the kitchen and barbecue. There is no
photograph of either, and narrating it over a bedroom is how "walk 13 minutes to
the beach" ended up over a picture of the car porch in the first cut. A test
asserts it stays out.

## Known debt

- **A synthetic voice is a stand-in.** The owner reading twenty seconds into her
  own phone would beat it, and costs her five minutes.
- **Fonts load from Google Fonts at render time**, 196 requests per family even
  after limiting weights and subsets, because CJK families are sliced into ~100
  files per weight. Subset to the glyphs the plan uses and commit them.
- **No music.** Licensing is a real constraint and borrowing a track is how a
  merchant gets a claim.
- **The scene list is hand-written** in `build-plan.mjs`. Phase 02 generates it;
  this package is the renderer, not the planner.
