# Laris

> *laris* — Malay for "selling well, in demand". What every shop owner wants said about their business.

**A customer-acquisition manager for Malaysian local businesses.** One place to keep your business details, offerings and promotions correct — then publish them everywhere customers actually look: Google Maps, your website, AI answer engines, and social.

Social media is one module inside it, not the product.

---

## What it does

Change your opening hours once. Your Google Business Profile, your website, your schema markup and your social bios all follow. That is the first thing Laris does, and it works without trusting any AI.

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

| Vertical | Offerings look like | `leads` means |
|---|---|---|
| `fnb` | Menu items | Enquiries / directions taps |
| `stay` | Room types, rates, min nights | Availability checks / direct-booking clicks |
| `retail` | Products | In-store enquiries |
| `service` | Services | Appointment requests |

Templates are the easiest and most valuable thing to contribute — see [CONTRIBUTING.md](CONTRIBUTING.md). If you run a business in one of these categories, you know your industry's fields better than we do.

---

## Stack

Two languages, roughly eighteen libraries, no servers until phase 02. Full reasoning and the complete dependency list with justifications: **[docs/STACK.md](docs/STACK.md)**.

| | |
|---|---|
| **Languages** | TypeScript (app, API, web, channels) · Python (perception pipeline only) |
| **API** | Hono on Cloudflare Workers |
| **Web** | Astro on Cloudflare Pages |
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
├── packages/
│   ├── schema/      # Zod schemas — the single source of truth for all three tables
│   ├── api/         # Hono on Cloudflare Workers
│   ├── web/         # Astro — merchant dashboard + generated merchant sites
│   ├── render/      # Remotion compositions
│   └── bot/         # Telegram (grammY)
├── perception/      # Python CLI — transcribe, scene-cut, OCR, VLM
└── docs/
```

## Getting started

> Early development. Phase 00 (business profile + channel sync) is the current focus; there is not much to run yet.

```bash
git clone https://github.com/Junhui20/laris.git
cd laris
pnpm install

# API, local
pnpm --filter @laris/api dev

# Web, local
pnpm --filter @laris/web dev

# Perception CLI (Python 3.11+)
cd perception && uv sync && uv run laris-perceive --url "<video url>"
```

Copy `.env.example` to `.env` and fill in your own keys. **Never commit credentials.**

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
