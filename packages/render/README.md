# `@laris/render`

Remotion compositions. Phase 02.

A Business Profile goes in, a **Shot Plan** comes out, and the compositions draw
the plan. Nothing in a composition reads a Profile, samples a photograph or
decides what to say — that happens once in `scripts/build-plan.mjs` and lands in
`src/shot-plan.json`.

That split is not tidiness. It is the boundary phase 01 and phase 02 have to
hold anyway (perception produces data, the renderer draws it), and it makes the
interesting decisions reviewable: a wrong panel colour or a mis-ordered shot is
a line in a diff, not something you find by watching twenty seconds of video.

```bash
pnpm --filter @laris/render plan     # compile the plan, copy the photographs
pnpm --filter @laris/render render   # out/listing-reel.mp4, out/listing-card.jpeg
pnpm --filter @laris/render studio   # Remotion Studio, for iterating on a shot
```

## Two layouts, and why

The merchant has **no vertical photographs**. All ten are landscape or 3:4.

- `full-bleed` — a 3:4 photograph survives a 9:16 crop and fills the frame.
  Type sits on a gradient in the photograph's own colour.
- `panel` — anything wider loses most of the room to a 9:16 crop, so it is
  cropped square, takes the top of the frame, and the caption sits on a panel
  below.

The first attempt blurred a copy of the photograph behind itself to fill the
gap. That is what every automatic listing video looks like, and it looked it.

## Colour comes from the house

`panelColor` is sampled per shot: the most saturated colour the photograph
actually contains, weighted by how much of the frame it covers, taken down to a
tone white type sits on. Averaging returns mud — every room in this house
averages to grey floor tile — and saturation alone picks the yellow front door,
which covers one percent of two frames.

## Known debt

- **Fonts load from Google Fonts at render time**, 196 requests per family even
  after limiting weights and subsets, because CJK families are sliced into
  ~100 files per weight. Subset to the glyphs the plan uses and commit them.
- **No audio.** Music licensing is a real constraint and borrowing a track is
  how a merchant gets a claim. `docs/strategy.md` settles on ElevenLabs; that
  needs a paid plan before it is a path.
- **The shot list is hand-written** in `build-plan.mjs`. Phase 02 generates it.
