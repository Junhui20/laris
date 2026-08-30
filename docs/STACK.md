# Stack

Two languages. Around eighteen libraries. No servers until phase 02.

This document is the answer to "what are we allowed to `npm install`". Every entry below earns its place; anything not listed needs an argument (see [Adding a dependency](#adding-a-dependency)).

---

## Languages: exactly two

| Language | Where | Why not the other one |
|---|---|---|
| **TypeScript** | App, API, web, all channel integrations, bot, Remotion compositions | Runs on Cloudflare's free tier, shares types with `mycal-core`, and it's the stack we already ship on. |
| **Python** | Perception pipeline only | Whisper, PySceneDetect and OCR are Python ecosystems. Reimplementing them in TS would be inventing work. |

**There is no third language.** If something seems to need one, it doesn't.

### Keeping them in sync

Schemas are defined **once**, in `packages/schema`, as Zod. From there:

```
Zod (packages/schema)  →  JSON Schema  →  Pydantic models (perception/)
```

Never hand-write the same shape twice. A drifted schema between TS and Python is the most likely way this project quietly breaks, and generating one from the other is the only reliable fix.

---

## Runtime: nothing to operate until phase 02

| Layer | Runs on | From when |
|---|---|---|
| API | Cloudflare Workers | Phase 00 |
| Web | Cloudflare Pages | Phase 00 |
| Database | Supabase (Postgres) | Phase 00 |
| Perception | **Local CLI on your own machine** | Phase 01 |
| Rendering | **Local CLI**, then one small box | Phase 02 |

Perception and rendering start as command-line tools you run yourself. They become services only when a real merchant needs them to run unattended. Until then there is nothing to deploy, nothing to monitor, and nothing to pay for.

### Database: Laris gets its own Supabase project

This is a **deliberate departure** from the ecosystem convention of one shared Supabase project as an identity pool.

Laris holds commercial merchant data — customer PII, pricing, business records — and is built with a partner. Mixing that into a personal project's identity pool creates ownership problems if the partnership ever changes shape, complicates RLS, and blurs who is data controller for someone else's business data. The cost of a separate project is one more set of credentials. Pay it.

---

## Dependencies

### TypeScript — 10

| Package | For | Instead of |
|---|---|---|
| `hono` | HTTP API on Workers | Express (doesn't run on Workers), raw handlers (no routing/middleware) |
| `zod` | Schema source of truth, runtime validation | Hand-written validators; also what `mycal-core` already speaks |
| `@supabase/supabase-js` | Postgres, auth, RLS | An ORM — see "not using" below |
| `@catlabtech/mycal-core` | Holidays, weekend groups, school terms, business days | Maintaining a Malaysian holiday table by hand, wrongly |
| `astro` | Merchant dashboard + generated merchant sites | Next.js — we need schema.org-heavy static output with a few interactive islands, which is exactly Astro's shape |
| `tailwindcss` | Styling | Hand-rolled CSS across two surfaces |
| `grammy` | Telegram bot | `telegraf` (heavier, weaker Workers story) |
| `remotion` + `@remotion/renderer` | Programmatic video, frame-accurate audio | MoviePy/Manim (slow and brittle server-side), a timeline editor UI (not our product) |
| `@elevenlabs/elevenlabs-js` | Voice, music, sound effects | Three separate audio vendors and three contracts |
| `vitest` + `biome` | Tests, lint + format | `eslint` + `prettier` (two tools, many plugins); biome is one binary |

**Google Business Profile is called with `fetch`.** The `googleapis` package is enormous and we need a handful of REST endpoints. A thin typed wrapper in `packages/api` is smaller than the SDK's install footprint.

### Python — 8

| Package | For |
|---|---|
| `yt-dlp` | Fetch source media and metadata across platforms |
| `faster-whisper` | Word-level transcription (the timestamps drive both auto-trim and audio ducking) |
| `scenedetect` | Shot boundaries → `cuts_per_10s`, `avg_shot_ms` |
| `rapidocr-onnxruntime` | On-screen text OCR; handles CJK + Latin, CPU-only, no PaddlePaddle install |
| `opencv-python-headless` | Frame extraction (already a scenedetect dependency) |
| `pydantic` | Generated from the Zod schema; validates pipeline output |
| `httpx` | HTTP |
| `google-genai` | VLM calls; swap base URL for an OpenAI-compatible Qwen3-VL endpoint |

Managed with `uv`. Python 3.11+.

---

## Not using, on purpose

| | Why not |
|---|---|
| **Next.js** | Astro fits better: our web output is schema.org-heavy static pages with a handful of interactive islands. Next brings a rendering model we'd be fighting. |
| **`googleapis` SDK** | Enormous, for a handful of REST calls. Use `fetch`. |
| **LangChain / agent frameworks** | The plan-approve-execute flow is a few hundred lines of our own code. A framework here adds indirection, not capability, and its abstractions move faster than our needs. |
| **An ORM (Prisma / Drizzle)** | `supabase-js` plus generated types covers this at our size. An ORM is a migration system we'd have to keep in sync with Supabase's. |
| **Turborepo** | pnpm workspaces alone until builds actually hurt. Adding it costs nothing later. |
| **Redis / a queue** | Cloudflare Queues if we ever genuinely need one. Not before there's a backlog to queue. |
| **ffmpeg sidechain compression** | Remotion's `volume` accepts `frame => number`, and we already have word-level timestamps — that ducks more precisely than envelope detection. |
| **Docker in production** | Workers and Pages. Docker only enters when the render box does, in phase 02. |
| **Postiz as a fork** | We call it over HTTP. Forking an AGPL-3.0 codebase is a licensing decision, not a convenience. |

---

## External services

| Service | Used for | Cost shape | Gotcha |
|---|---|---|---|
| Cloudflare Workers / Pages | API + web | Free tier | — |
| Supabase | Postgres, auth | Free tier initially | Own project — see above |
| Google Business Profile API | Maps posts, hours, photos, attributes | Free | **Quota defaults to 0** — the increase request is a prerequisite, file it early |
| ElevenLabs | Voice, music, SFX | ~4–8¢ per 60s clip; SFX $0.0194 each | Self-serve commercial clearance has scope limits; revisit at first paying merchant |
| Gemini / Qwen3-VL | Perception VLM | Per token; bulk work goes to self-hosted Qwen | Video billed per second — send keyframes, never whole clips |
| Postiz (self-hosted) | Social publishing | Free | AGPL-3.0 — call it over HTTP, never fork |
| mycal | Calendar | Free, ours | Embed `mycal-core`; don't have production hammer its public API |

---

## Adding a dependency

Open a PR that answers three questions in the description:

1. **What does it replace?** Hand-written code, or another dependency we can then drop?
2. **What is the install and bundle cost?** For anything running on Workers, this is a hard constraint, not a preference.
3. **What happens when it's abandoned?** If the answer is "we'd be stuck", prefer writing the thin version ourselves.

The count above is not a hard cap, but it is a budget. Every addition should make the list feel *more* justified, not longer.
