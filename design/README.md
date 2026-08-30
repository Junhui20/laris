# Design

Prototypes for the Merchant Site templates. These are the reference the
`hono/jsx` renderer in `packages/api` is built against — not throwaway mockups.

## `stay-gallery-first.html`

The default `stay` template. Content is placeholder — a plausible Penang
homestay — and must be swapped for a real merchant before anything ships.

Decisions this prototype encodes:

- **Mobile first, and the call to action is WhatsApp.** In Malaysia the booking
  enquiry is a WhatsApp message, not a form and not email. The bar is fixed to
  the bottom within thumb reach, carries the starting price, and wears
  WhatsApp's own green — recognising what the button does matters more here
  than keeping the palette pure.
- **Photo slots ship a brief, not stock imagery.** Each slot names the shot the
  owner has to take. Photography decides whether this page looks good far more
  than the CSS does, so the brief is part of the design.
- **The direct-booking saving is stated in ringgit**, beside the OTA price.
  Commission is the thing an owner actually feels; an abstract "book direct"
  is not an argument.
- **Peak rates sit on the room card**, because in this vertical the calendar
  sets the price. School and public holidays are not context for a promo.
- **schema.org `LodgingBusiness` and `FAQPage` are in the page**, not bolted on
  later. They are what Answer Presence is built from.
- **One committed light theme.** A guest-facing hospitality page should look
  the same for every visitor; every colour is painted explicitly.

The four theme levers a merchant varies — `layout`, `accent`, `typePair`,
`density` — are declared at the top of the stylesheet and defined in
`@laris/schema`'s `SiteTheme`. Nothing else is adjustable, by design: the
moment a merchant is moving spacing around, we have built a page builder.

## Two paths to a site

A Merchant either picks a **template** — the default, and what this folder holds
— or has one **designed by a model**, which is the paid path.

Both are bound by the same contract, and the contract is checked before anything
goes live: required blocks, structured data that matches the Business Profile
exactly, mobile-first with content present without JavaScript, and content read
from the Profile at render time rather than baked into markup. A custom design
is generated once and pinned; the data stays live. See
[ADR-0003](../docs/adr/0003-generated-sites-are-validated-and-frozen.md).

The template path is built first on purpose: the contract is easier to write by
discovering what a well-made page needs than by imagining it, and the model
needs a good reference to work from.
