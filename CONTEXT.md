# Context

The ubiquitous language of Laris. If a term appears here, use it exactly — in code, in the database, in the UI, and in conversation. If you need a word that isn't here, add it here first.

This file is a glossary. It holds no implementation detail, no rationale, and no plans. Rationale for hard decisions lives in [`docs/adr/`](docs/adr/).

---

## Account

Who Laris bills, and who the brand belongs to. Holds the things that stay the same across locations: brand name, tone of voice, WhatsApp identity, billing.

An Account owns one or more Merchants. For a single-location business it is invisible — one Account, one Merchant.

## Merchant

**One location.** One Google Business Profile card, one address, one Malaysian state.

The state is what makes this a location and not a business: it fixes the public holidays and the weekend group, so a Merchant spanning two states would be wrong in one of them. A family with a homestay in Penang and another in Cameron Highlands has one Account and two Merchants.

A Merchant is the unit everything operational hangs off: one Business Profile, one set of Channels, one Vertical.

## Vertical

The kind of business a Merchant is: `fnb`, `stay`, `retail`, `service`.

A Vertical decides what an Offering looks like and what counts as a Contact. It is not a category label for display — it changes the shape of the data.

## Business Profile

The complete truthful description of a Merchant: identity, location, opening hours, Offerings, calendar, FAQ.

The Business Profile is the **single source of truth**. Every Channel shows a projection of it. When the Profile and a Channel disagree, the Profile is right and the Channel is stale.

## Offering

A thing the Merchant sells. Its shape is decided by the Vertical: a menu item for `fnb`, a room type for `stay`, a product for `retail`, a service for `service`.

"Offering" is the umbrella term. In `stay` code and UI, say **Room Type** — use the Vertical's own word where the Vertical is known, and `Offering` only where it isn't.

## Channel

A place customers encounter the Merchant, which Laris keeps in step with the Business Profile.

The Channels are: **Google Business Profile**, the **Merchant Site**, **social platforms**, and **Xiaohongshu**. A Merchant's own pre-existing website is also a Channel, even though Laris cannot write to it.

Answer-engine visibility is *not* a Channel — see [Answer Presence](#answer-presence).

A Channel supports some combination of three capabilities, and **which ones is decided by the platform, not by us**. Never say "sync": say which of the three you mean.

### Publish

Sending something new out: a Google Business Profile post, a video, an article.

### Profile Write

Correcting information that already exists: opening hours, phone, address, prices.

Publish and Profile Write are independent. TikTok accepts published video but permits no Profile Write at all; a Merchant's own website permits neither.

### Drift Check

Reading a Channel, comparing it against the Business Profile, and reporting where they disagree.

Drift Check is what a Channel gets when Profile Write is unavailable, and it needs no write access of any kind. It is not a degraded fallback — a Merchant cannot see for themselves that their hours read 9–6 on Google, 10–7 on Facebook and nowhere at all on their own site, because nobody opens four tabs to compare. The report is the product.

## Approval

A Merchant's explicit consent before anything is published in their name.

Laris proposes; the Merchant approves or edits; only then does it publish. Laris never acts as the Merchant unprompted, never touches their followers or replies, and never sends a WhatsApp message on their behalf. Every approval and every edit is also a signal about what that Merchant considers good.

## Merchant Site

The web page Laris hosts for a Merchant, rendered live from the Business Profile.

It is not a website builder and not a product the Merchant maintains. It is a projection — the Merchant changes the Profile, never the Site. It is served on a Laris subdomain by default, or on the Merchant's own domain.

## Answer Presence

Whether an answer engine — Google AI Overviews, ChatGPT, Perplexity, Gemini, Ask Maps — describes the Merchant correctly when asked about them.

Answer Presence is an **outcome**, not a Channel. Nothing is ever published "to" it. It is produced by the Merchant Site's structured data, a complete Google Business Profile, and consistent identity across Channels. Say "Answer Presence" rather than AEO or GEO.

## Contact

One observed act of interest by a customer: a WhatsApp tap, a call tap, a directions tap, an availability check.

Contacts are **dense, automatic and same-day**. They are counted, never estimated, and they are the dependent variable for anything statistical. A Contact is not a person and not a customer — the same person tapping twice is two Contacts.

## Booking

One completed piece of business that came direct rather than through an intermediary: a confirmed direct stay, a reservation, a job won.

Bookings are **sparse, merchant-reported and real money**. The Merchant reports a count periodically; Laris never infers it. Bookings carry the return-on-investment story; Contacts carry the statistics.

> **Retired term: "lead."** It was doing both jobs at once — meaning "someone showed interest" in one place and "someone actually bought" in another. Use Contact or Booking. Never "lead."

## Content DNA

The structured, measurable description of one piece of published content — its hook, pacing, on-screen text, call to action, spoken transcript.

Content DNA holds only measurable quantities. An adjective an LLM invented is not Content DNA; a cut count is. It describes both the Merchant's own content and watched competitors' content, distinguished by a single flag.

## Outcome

What a piece of content actually achieved, collected per time window: views, watch-through, Contacts, and where known, Bookings.

Content DNA plus Outcome is what makes content improvable. Either one alone is decoration.

## Watchlist

Competitor accounts a Merchant wants tracked. New content from them is turned into Content DNA automatically.

## Vertical Template

The definition of one Vertical: the shape of its Offerings, what counts as a Contact and a Booking, and any extra Profile fields it needs.

A Vertical Template **extends**; it never modifies the shared core and never changes another Vertical.
