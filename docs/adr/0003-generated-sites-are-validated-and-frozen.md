# Custom-designed sites are validated against a contract and frozen at generation

A Merchant Site can be produced two ways: pick a **template**, which is the default, or have one **designed by a model**, which is the paid path for merchants who want something of their own.

The obvious objection to the second path is that quality becomes unpredictable and unsupportable — a merchant complains their page looks wrong and there is nothing to inspect, because it was different last time. Two rules resolve that without giving up the freedom.

**A contract, checked by a machine before anything goes live.** The design is free at the presentation layer and fixed everywhere else. Required blocks must be present (hero, offerings with prices, location, FAQ, a persistent WhatsApp call to action). Required structured data must parse and must match the Business Profile character for character. Required behaviour must hold: mobile-first, a performance budget, readable contrast, and content that is present without JavaScript, because crawlers and answer engines do not wait for hydration. And all content must be **read from the Business Profile at render time** — a generated page may never bake an address or a price into its markup. A generation that fails the check is regenerated or falls back to the template; it does not ship.

**The design is generated once and pinned; the data stays live.** A site is stored as a version — markup, styles, and the bindings that fill them — and re-rendered per request against current data. So the unpredictable thing is the *style*, chosen once and then stable, not the page a guest sees on any given afternoon. Changing a price still updates the page; nothing re-designs itself. Versions are inspectable and revertible, which is what makes a complaint answerable.

## Consequences

The data-binding rule is what protects the product's first promise. If a generated page were allowed to hardcode opening hours, "change it once and everywhere follows" would quietly stop being true for exactly the merchants who paid extra — the worst possible group to break it for.

The template path is built first and deliberately: the model needs a good reference to work from, and the contract is much easier to write by discovering what a well-made page actually needs than by imagining it.
