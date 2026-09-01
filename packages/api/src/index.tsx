import { BusinessContext } from "@laris/schema";
import { Hono } from "hono";
import { type Env, getBusinessContext } from "./repo/merchant.js";
import { StaySite } from "./site/render.js";

type Bindings = Env & { ENVIRONMENT?: string; ALLOW_FIXTURE?: string; API_TOKEN?: string };

const app = new Hono<{ Bindings: Bindings }>();

/**
 * Development is declared, never inferred. It used to be `!env.SUPABASE_URL`,
 * which made every deployment without a database look like a laptop — so a
 * misconfigured production Worker served the built-in fixture and called it
 * fine, which is the exact failure the repo layer warns about.
 */
const isDev = (env: Bindings) => env.ENVIRONMENT !== "production";

/**
 * Whether the built-in fixture Merchant may be served. Deliberate in
 * production: one real merchant, hand-maintained, until #3 lands.
 */
const allowFixture = (env: Bindings) => isDev(env) || env.ALLOW_FIXTURE === "true";

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
 * A Merchant Site, rendered from the Business Profile on every request.
 *
 * Reachable at /site/:slug during development. In production each Merchant is
 * served on its own hostname — `<slug>.laris.my`, or their own domain via
 * Cloudflare for SaaS — and the hostname resolves to the same handler.
 */
app.get("/site/:slug", async (c) => {
  const slug = c.req.param("slug");
  const ctx = await getBusinessContext(c.env, slug, { allowFixture: allowFixture(c.env) });
  if (!ctx) return c.notFound();

  if (ctx.vertical !== "stay") {
    // Other verticals get their own templates; until then, fail honestly
    // rather than rendering a stay page with the wrong words on it.
    return c.text(`no template yet for vertical "${ctx.vertical}"`, 501);
  }

  const siteUrl = `${new URL(c.req.url).origin}/site/${slug}`;

  // Cached at the edge, purged when the Profile changes. Freshness is the
  // product promise, so the TTL is short and the purge is the real mechanism.
  c.header("cache-control", "public, max-age=60, s-maxage=300");
  return c.html(<StaySite ctx={ctx} siteUrl={siteUrl} />);
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
