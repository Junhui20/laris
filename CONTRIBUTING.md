# Contributing to Laris

Laris is built by a small team and developed in the open. Outside contributions are welcome — some kinds much more than others, so start here.

---

## Where help is most valuable

**1. Vertical templates** — the highest-value thing an outsider can contribute.

A vertical template describes what a *kind of business* looks like: what an "offering" is, which fields matter, what counts as a lead. We have `fnb`, `stay`, `retail` and `service`. If you run a salon, a workshop, a clinic, a homestay or a hardware shop, **you know your industry's fields better than we do**. See [Adding a vertical](#adding-a-vertical).

**2. Malaysian localisation** — holiday edge cases, state quirks, Malay/Manglish copy patterns, script handling for mixed ms/en/zh text. Calendar data itself belongs upstream in [mycal](https://github.com/Junhui20/malaysia-calendar-api).

**3. Channel adapters** — a new publishing target that fits the existing interface.

**4. Bugs, with a reproduction.**

### What we will likely decline

Not because the work is bad, but because it moves the project somewhere it has decided not to go:

- **Anything that turns Laris into a POS, inventory, accounting or booking system.** The boundary is deliberate: Laris manages how people find a business, not what happens after they arrive.
- **A timeline editor UI.** Video quality comes from good templates driven by measured pacing, not from giving merchants sliders.
- **WhatsApp automation** driving a merchant's own account. Reverse-engineered libraries get accounts permanently banned. Drafting a suggested reply for a human to send is fine; sending it is not.
- **New dependencies without a case.** See [STACK.md](docs/STACK.md#adding-a-dependency).

Please open an issue before writing code for anything non-trivial.

---

## The two rules

These exist because this project's most likely failure is not a bug — it's turning into a bloated business suite that does everything adequately and nothing well.

### Rule 1 — the five-table rule

`business_context` is capped at roughly five tables, and every field must serve content generation.

> **Before adding a field, answer: *without it, does the generated content get worse?***
>
> If you can't answer, the field doesn't go in.

"A merchant might want to track it" is not an answer. Plenty of things merchants want to track belong in software that isn't this one.

### Rule 2 — verticals extend, they never modify core

A new industry is a **new template**. It does not add fields to the shared core, and it does not change another vertical. If two verticals need the same new core field, that's a discussion in an issue, not a PR.

---

## Schema changes

The three tables — `business_context`, `content_dna`, `content_outcome` — are defined **once**, in `packages/schema`, as Zod. Python's Pydantic models are generated from there.

- Never edit the generated Python models by hand.
- Any change to `content_dna` **must bump `schema_version`**.
- Raw perception artefacts (transcript, keyframes, OCR text) are retained precisely so historical data can be recomputed after a schema change. Don't add a change that makes old rows unrecoverable.

---

## Adding a vertical

1. Open an issue describing the industry and what makes its fields different. Include a real business as an example, not a hypothetical one.
2. Add the template under `packages/schema/verticals/<name>.ts`.
3. Define, explicitly:
   - what an **offering** is for this industry (menu item? room type? service? SKU?)
   - what **`leads`** means — this one matters most; the whole outcome regression keys off it
   - any industry-specific `profile` extension
4. Include one realistic filled-in example. A Malaysian business, with real-shaped values.

Templates are data and config. They are low-risk to review and high-value to get right, which is why they're the best entry point.

---

## Development

```bash
git clone https://github.com/Junhui20/laris.git
cd laris
pnpm install
cp .env.example .env    # fill in your own keys

pnpm --filter @laris/api dev     # API
pnpm --filter @laris/web dev     # Web

cd perception && uv sync         # Python 3.11+
```

Video work also needs the compositions' assets and Remotion's own agent skills:

```bash
pnpm --filter @laris/render plan     # compile the shot plan, copy photographs
pnpm --filter @laris/render render   # out/listing-reel.mp4, out/listing-card.jpeg
pnpm --filter @laris/render studio   # Remotion Studio

npx skills add remotion-dev/skills   # agent guidance; versions pinned in skills-lock.json
```

`.agents/` and `.claude/` are gitignored — they are 3.4 MB of vendored markdown
that `skills-lock.json` can reproduce. Rendering uses the system Chrome rather
than downloading Remotion's own Headless Shell.

Before pushing:

```bash
pnpm check        # biome lint + format
pnpm test         # vitest
cd perception && uv run pytest
```

---

## Pull requests

- **Branch off `main`; never push to it directly.** Both maintainers included.
- One logical change per PR. A PR that renames things *and* adds a feature is two PRs.
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`. Scope where it helps — `feat(stay): add rate_calendar`.
- Fill in the PR template — especially "what does this replace" if you added a dependency.
- CI must be green. If a test is wrong, fix the test in its own commit and say why.

### Review

Every PR needs one approval from the other maintainer. This holds even for trivial changes: with a two-person team, review is the only thing standing between a bad idea and `main`.

See [`.github/CODEOWNERS`](.github/CODEOWNERS) for who reviews what.

---

## Secrets

Never commit credentials — not in code, not in tests, not in a "temporary" branch. Git history is forever, and this repository is public.

- Real values go in `.env`, which is gitignored.
- Every new variable gets an entry in `.env.example` with a dummy value and a comment.
- Cloudflare secrets go in via `wrangler secret put`, never in `wrangler.toml`.

If you commit a secret by accident: **rotate it first**, then tell a maintainer. Removing the commit is not sufficient and is not the first step.

---

## Private material

`docs/strategy.md` and `docs/*.html` are gitignored on purpose. They hold commercial reasoning — competitor analysis, unit economics, go-to-market sequencing — that isn't published.

What's public is *what Laris is and how it's built*. What's private is *why it's built that way*. Don't move content across that line without asking.

---

## Licence

**Undecided, deliberately. No rights are granted at this time.**

The source is public so the work can be read, discussed and learned from. It is not yet licensed for reuse, and publishing without a licence means default copyright applies.

This is intentional: licences grant rights that **cannot be withdrawn** once granted. It costs nothing to choose later and everything to choose wrongly now. The options on the table:

| Option | Effect |
|---|---|
| **AGPL-3.0** | Open source, but anyone running a modified version as a network service must publish their source. This is the licence Postiz used while growing to $2M ARR — it protects against a SaaS clone while staying genuinely open. |
| **A source-available licence** (BSL or similar) | Readable and self-hostable, but commercial competing use is restricted, usually converting to open source after a fixed term. Not OSI open source. |
| **MIT** | Maximum adoption, no protection. Anyone may take it commercially, including a competitor. |

We'll decide before merging the first outside pull request. If you're considering a substantial contribution and the licence matters to you, **open an issue and say so** — that's a good reason to settle it sooner.

---

## Conduct

Be straightforward and assume good faith. Disagree about the work, not the person. Malaysian directness is welcome; rudeness isn't.
