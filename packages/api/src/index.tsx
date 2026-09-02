import { BusinessContext } from "@laris/schema";
import { Hono } from "hono";
import { Home, Privacy, Terms } from "./app/pages.js";
import { type Env, getBusinessContext } from "./repo/merchant.js";
import { StaySite } from "./site/render.js";

type Bindings = Env & { ENVIRONMENT?: string };

const app = new Hono<{ Bindings: Bindings }>();

const isDev = (env: Bindings) => !env.SUPABASE_URL;

app.get("/health", (c) =>
  c.json({
    ok: true,
    // Says plainly whether real data is wired up, so nobody demos the fixture
    // by accident and reports it as working.
    source: isDev(c.env) ? "fixture" : "supabase",
  }),
);

/**
 * Laris's own pages.
 *
 * They exist for platform review rather than for marketing. TikTok restricts
 * every post by an unaudited client to private viewing and lifting that needs
 * an audit; Meta's App Review asks the same kind of questions. Both want to see
 * what the application is and what it does with people's data, and neither will
 * read a repository.
 *
 * MERGE NOTE: #11 adds host-based Merchant routing and its own `/` handler.
 * Hono matches in registration order, so the Merchant host lookup must come
 * first — otherwise a merchant's own domain would serve this page instead of
 * their listing. Resolve that deliberately when the two branches meet.
 */
app.get("/", (c) => c.html(<Home />));
app.get("/privacy", (c) => c.html(<Privacy />));
app.get("/terms", (c) => c.html(<Terms />));

/**
 * A Merchant Site, rendered from the Business Profile on every request.
 *
 * Reachable at /site/:slug during development. In production each Merchant is
 * served on its own hostname — `<slug>.laris.my`, or their own domain via
 * Cloudflare for SaaS — and the hostname resolves to the same handler.
 */
app.get("/site/:slug", async (c) => {
  const slug = c.req.param("slug");
  const ctx = await getBusinessContext(c.env, slug, { allowFixture: isDev(c.env) });
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
    allowFixture: isDev(c.env),
  });
  if (!ctx) return c.json({ error: "not found" }, 404);
  return c.json(BusinessContext.parse(ctx));
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

export default app;
