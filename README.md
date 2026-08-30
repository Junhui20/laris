# Laris

> *laris* — Malay for "selling well, in demand". What every shop owner wants said about their business.

**A customer-acquisition manager for Malaysian local businesses.** One place to keep your business details, offerings and promotions correct — then publish them everywhere customers actually look: Google Maps, your website, AI answer engines, and social.

Social media is one module inside it, not the product.

---

## What it does

Change your opening hours once. Google Maps and your website update themselves. For the places nobody can write to — your TikTok profile, your Xiaohongshu page, the website you built years ago — Laris tells you exactly where they still disagree.

That is the first thing Laris does, and it works without trusting any AI.

On top of that, it understands content well enough to make more of it: it reads what's working (yours and your competitors'), turns real customer questions into FAQ markup, and proposes posts drawn from what you actually sell, what's on this week, and what brought in enquiries last month.

### Scope

| Module | |
|---|---|
| **01 Business profile** | Shop details, offerings + prices, selling points, event calendar. Deliberately small — around five tables. |
| **02 Competitor radar** | Watchlist accounts torn down into structured data, not a report you read once and forget. |
| **03 Content factory** | Proposes from profile × calendar × last month's results. You edit or approve; you never fill in blanks. |
| **04 Channel distribution** | Maps, website, social and Xiaohongshu in parallel. You see one calendar. |
| **05 Performance** | Reports how many people *asked about you*, not how many views you got. |

**Not in scope:** POS, inventory, accounting, invoicing, staff scheduling, bookings, loyalty cards.

> **The boundary in one line: Laris manages how people find you, not what happens after they arrive.**

If you want a POS, use StoreHub or Loyverse. Laris is not trying to become one.

---

## Built for Malaysia specifically

This is the part generic tools get wrong, and it is not cosmetic:

- **Public holidays differ by state.** All 16 states and 3 federal territories, plus *cuti ganti* replacement logic.
- **So does the weekend.** Kedah, Kelantan and Terengganu run Friday–Saturday; everywhere else is Saturday–Sunday. A scheduler written with KL assumptions posts at the wrong time in Kota Bharu — and prices weekends wrong for accommodation.
- **School terms drive accommodation pricing**, and they too split by *Kumpulan* A/B.
- **Long weekends are content timing.** The promo window is two to three weeks *before* one, not during it.
- **Malay / English / Chinese code-switching** is the norm, not an edge case — in copy, in captions, and in customer questions.

All of that comes from [**mycal**](https://github.com/Junhui20/malaysia-calendar-api), our open-source Malaysia Calendar API — official gazette data (JPM BKPP, JAKIM, KPM, MPM), not scraped.

---

## Industry templates

The business profile is **core (shared) + vertical (specialised)**. A new industry is a new template, not a change to the core.

| Vertical | An Offering is | A Contact is |
|---|---|---|
| `fnb` | A menu item | An enquiry or a directions tap |
| `stay` | A room type, with rates and minimum nights | An availability check or a direct-booking tap |
| `retail` | A product | An in-store enquiry |
| `service` | A service | An appointment request |

Terms are defined in [CONTEXT.md](CONTEXT.md) — use them exactly. Note there is
no such thing as a "lead" here: a **Contact** is observed interest and a
**Booking** is business actually won, and conflating them is how a product ends
up reporting numbers it cannot measure.

Templates are the easiest and most valuable thing to contribute — see [CONTRIBUTING.md](CONTRIBUTING.md). If you run a business in one of these categories, you know your industry's fields better than we do.

---

## Stack

Two languages, around nineteen libraries, no servers until phase 02. Full reasoning and the complete dependency list with justifications: **[docs/STACK.md](docs/STACK.md)**.

| | |
|---|---|
| **Languages** | TypeScript (app, API, web, channels) · Python (perception pipeline only) |
| **API** | Hono on Cloudflare Workers |
| **Dashboard** | React + Vite on Cloudflare Pages |
| **Merchant sites** | Edge-rendered by the API Worker (`hono/jsx`) — never stale |
| **Data** | Supabase (Postgres) |
| **Video** | Remotion |
| **Audio** | ElevenLabs (voice, music, SFX) |
| **Calendar** | `@catlabtech/mycal-core` |
| **Chat** | grammY (Telegram) |

Schemas are defined **once**, in `packages/schema` as Zod, and generated into Pydantic for Python. Never hand-maintain two copies.

---

## Repository layout

```
laris/
├── CONTEXT.md       # the ubiquitous language — read this first
├── packages/
│   ├── schema/      # Zod — the single source of truth for every domain shape
│   ├── api/         # Hono on Workers: JSON API + Merchant Site rendering
│   └── web/         # React + Vite — merchant dashboard
├── design/          # site template prototypes; source of truth for how sites look
├── scripts/         # sync:styles lifts the prototype's CSS into the renderer
└── docs/
    ├── STACK.md     # every dependency, and what it replaced
    └── adr/         # why the hard-to-reverse decisions went the way they did
```

**Not built yet, on purpose.** These arrive when the phase that needs them
does — an empty package is clutter, not a head start:

| | Arrives in | For |
|---|---|---|
| `perception/` | Phase 01 | Python CLI: transcribe, scene-cut, OCR, VLM → Content DNA |
| `packages/render/` | Phase 02 | Remotion compositions |
| `packages/bot/` | Phase 02 | Telegram, and the plan-approve-execute flow |

## Getting started

**A fresh clone runs with no credentials.** With Supabase unconfigured the API
serves a built-in fixture merchant, so you can see a finished Merchant Site
within a minute of cloning.

```bash
git clone https://github.com/Junhui20/laris.git
cd laris
pnpm install

pnpm dev:api      # Worker on :8787
pnpm dev:web      # dashboard on :5173 (proxies /v1 and /site to the Worker)
```

Then open:

| | |
|---|---|
| http://localhost:8787/site/rumah-ombak | a complete Merchant Site, rendered from the fixture |
| http://localhost:8787/v1/merchants/rumah-ombak | the Business Profile behind it |
| http://localhost:5173 | the merchant dashboard |
| http://localhost:8787/health | says `fixture` or `supabase`, so nobody demos the fixture by accident |

Everything on that page is derived, not written into the template — including
the direct-booking saving, which is the OTA rate minus the direct rate. Change
a price in `packages/api/src/fixtures/rumah-ombak.ts` and the page follows.

### Checks

```bash
pnpm check        # biome lint + format
pnpm typecheck    # all packages
pnpm test         # vitest
```

### Working on the site design

`design/stay-gallery-first.html` is the source of truth for how a Merchant Site
looks. Edit it, then:

```bash
pnpm sync:styles  # lifts its <style> block into the renderer
```

Never edit `packages/api/src/site/styles.ts` — it is generated.

### Connecting Supabase

Copy `.env.example` to `.env` and fill it in. Once `SUPABASE_URL` is set the
fixture is refused rather than silently used, so a misconfigured deployment
fails loudly instead of serving someone else's homestay.

---

## Status

| Phase | |
|---|---|
| **00 · Business profile + channel sync** | ← current |
| 01 · Perception layer | |
| 02 · Content factory + conversational approval | |
| 03 · Outcome loop | |

---

## Contributing

Yes, please — especially vertical templates and Malaysian localisation. Read [CONTRIBUTING.md](CONTRIBUTING.md) first; it explains the flow, the guardrails, and the two rules that keep this project from turning into an ERP.

## Licence

**Not yet chosen — no rights are granted at this time.** The source is public so the work can be read and discussed; it is not yet licensed for reuse. See [CONTRIBUTING.md](CONTRIBUTING.md#licence) for the options under consideration and why this is deliberate.

## Related

- [mycal](https://github.com/Junhui20/malaysia-calendar-api) — Malaysia Calendar API (MIT). Laris is its first production consumer.
