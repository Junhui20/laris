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
