import { BusinessContext } from "@laris/schema";
import type { Context } from "hono";
import { Hono } from "hono";
import { driftRoutes } from "./drift/route.js";
import { type Bindings, allowFixture, isDev } from "./env.js";
import { getBusinessContext } from "./repo/merchant.js";
import { StaySite } from "./site/render.js";

const app = new Hono<{ Bindings: Bindings }>();

/** Length-independent comparison, so a token cannot be guessed byte by byte. */
function tokenMatches(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

app.route("/v1", driftRoutes);

app.get("/health", (c) =>
  c.json({
    ok: true,
    // Says plainly whether real data is wired up, so nobody demos the fixture
    // by accident and reports it as working.
    source: c.env.SUPABASE_URL ? "supabase" : "fixture",
  }),
);

/**
 * The JSON API is not public. #8 is the real gate — a caller identity on every
 * /v1 route, scoped to their own Account — and this is only the stopgap that
 * keeps a deployed Worker from handing a Business Profile to anyone who guesses
 * a slug. Merchant Sites stay open; they are the product.
 */
app.use("/v1/*", async (c, next) => {
  const expected = c.env.API_TOKEN;
  if (!expected) {
    // Nothing to check against. Outside development the routes are not there.
    if (!isDev(c.env)) return c.json({ error: "not found" }, 404);
    return next();
  }
  const given = c.req.header("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!tokenMatches(given, expected)) return c.json({ error: "unauthorized" }, 401);
  return next();
});

/**
 * Merchant Sites are served on their own hostname — that is the product, and a
 * guest should never see a URL with our slug in it.
 *
 * Until #3 this map is the whole registry. It belongs in the merchants table
 * beside the slug; a Merchant does not have a domain in the schema yet, and
 * inventing one for a single real merchant would be the wrong order.
 */
const SLUG_BY_HOST: Readonly<Record<string, string>> = {
  // The first host listed for a slug is its canonical one.
  "pangkormyhomestay.top": "pangkor-my-homestay",
  "www.pangkormyhomestay.top": "pangkor-my-homestay",
};

/**
 * One address per Merchant, whichever hostname the request arrived on.
 *
 * A page reachable at an apex, a www and a slug path is three pages as far as
 * a search engine is concerned — it splits whatever Answer Presence the site
 * earns, and it is a Drift Check finding waiting to happen.
 */
function canonicalUrl(slug: string, requestUrl: URL): string {
  const domain = Object.entries(SLUG_BY_HOST).find(([, s]) => s === slug)?.[0];
  return domain ? `https://${domain}/` : `${requestUrl.origin}/site/${slug}`;
}

/**
 * A Merchant Site, rendered from the Business Profile on every request.
 *
 * Rendered rather than built ahead of time on purpose: a static build stays
 * wrong until the next one, and "change it once and everywhere follows" is the
 * first thing this product promises.
 */
async function renderSite(c: Context<{ Bindings: Bindings }>, slug: string, siteUrl: string) {
  const ctx = await getBusinessContext(c.env, slug, { allowFixture: allowFixture(c.env) });
  if (!ctx) return c.notFound();

  if (ctx.vertical !== "stay") {
    // Other verticals get their own templates; until then, fail honestly
    // rather than rendering a stay page with the wrong words on it.
    return c.text(`no template yet for vertical "${ctx.vertical}"`, 501);
  }

  // Cached at the edge, purged when the Profile changes. Freshness is the
  // product promise, so the TTL is short and the purge is the real mechanism.
  c.header("cache-control", "public, max-age=60, s-maxage=300");
  return c.html(<StaySite ctx={ctx} siteUrl={siteUrl} />);
}

/** The merchant's own domain. The canonical URL, and what goes on the GBP. */
app.get("/", async (c) => {
  const url = new URL(c.req.url);
  const slug = SLUG_BY_HOST[url.hostname];
  if (!slug) return c.notFound();
  return renderSite(c, slug, canonicalUrl(slug, url));
});

/** The same site by slug, for development and for a merchant with no domain. */
app.get("/site/:slug", async (c) => {
  const slug = c.req.param("slug");
  return renderSite(c, slug, canonicalUrl(slug, new URL(c.req.url)));
});

/** The Business Profile behind a site. Read-only for now. */
app.get("/v1/merchants/:slug", async (c) => {
  const ctx = await getBusinessContext(c.env, c.req.param("slug"), {
    allowFixture: allowFixture(c.env),
  });
  if (!ctx) return c.json({ error: "not found" }, 404);
  return c.json(BusinessContext.parse(ctx));
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

export default app;
