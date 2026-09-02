# Where the binaries came from

Everything in a rendered video that is not the merchant's own photograph is
listed here, with what it is, where it came from, and on what terms. A reviewer
should not have to ask.

## Typeface — `src/font-data.ts`

| | |
|---|---|
| Family | Noto Sans CJK SC, weights 400 and 900 |
| Source | the system installation of `fonts-noto-cjk` / `fonts-noto-cjk-extra`, SC face (index 2) of each `.ttc` |
| Upstream | https://github.com/notofonts/noto-cjk |
| Copyright | 2010–2012 Google Corporation, and the Noto CJK authors |
| Licence | **SIL Open Font License 1.1** — full text in [`licenses/OFL-1.1.txt`](./licenses/OFL-1.1.txt) |

Subsetted to the 136 glyphs the shot plan puts on screen and inlined as a data
URI by `scripts/build-fonts.mjs`. Subsetting and renaming are both permitted by
the OFL; the reserved font name is not used, and the family is registered as
`Noto Sans SC Subset`. The licence text travels with the repository, which is
what the OFL requires of a derivative.

Regenerate with `pnpm --filter @laris/render fonts`.

## Narration — `public/vo/raw/*.mp3`

| | |
|---|---|
| Generated | 2026-09-02 |
| Platform | Higgsfield (account `imstorage.my@gmail.com`, Ultra plan) |
| Model | `text2speech_v2`, variant **MiniMax** |
| Voice | preset `9d3128b8-dd25-5158-9bdb-2e69ac8998b9` ("Giselle") |
| Cost | ≈0.1 credit per line |

Eight lines, one per scene, and one earlier take (`line-6`, the kitchen and
barbecue) that was generated and deliberately not used — no photograph in this
set shows either.

`scripts/process-voiceover.mjs` trims the silence, speeds the delivery up by a
constant, and normalises to −16 LUFS. Those files are generated and gitignored;
the raw takes are committed because re-fetching them costs credits and a clone
without them renders silent with the wrong timing.

**Commercial-use clearance is not established.** The takes are a stand-in while
the edit is being judged. Before anything is published on the merchant's behalf,
one of these has to be true:

- the platform's terms are read and confirmed to permit commercial use of
  synthesised speech on a paid plan, and that reading is recorded here; or
- the narration is re-recorded by the owner herself, which is the better answer
  anyway — twenty seconds on her own phone, no licence question, and her voice.

`docs/strategy.md` settles on ElevenLabs as the audio supplier and records that
self-serve clearance there excludes some categories; that decision has not been
made for this provider.

## Music

None. Higgsfield's music model is marked "game pipeline only" and ElevenLabs
Music needs a paid key. Nothing is committed and `plan.music` appears only when
a licensed file is really at `public/music/bed.mp3` — borrowing a track is how a
merchant collects a copyright claim on their own listing.

## Photographs

The merchant's own, already public on her Google Business Profile and Facebook
page; she is the one asking for the site. They live with the Merchant at
`packages/api/public/m/pangkor-my-homestay/` and are copied here by `pnpm plan`.
Verified to carry no EXIF — JFIF and an ICC profile only, so no GPS.
