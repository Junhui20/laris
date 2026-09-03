import { BusinessContext } from "@laris/schema";
import { Hono } from "hono";
import { driftRoutes } from "./drift/route.js";
import { type Env, getBusinessContext } from "./repo/merchant.js";
import { StaySite } from "./site/render.js";

type Bindings = Env & { ENVIRONMENT?: string };

const app = new Hono<{ Bindings: Bindings }>();

const isDev = (env: Bindings) => !env.SUPABASE_URL;

app.route("/v1", driftRoutes);

app.get("/health", (c) =>
  c.json({
    ok: true,
    // Says plainly whether real data is wired up, so nobody demos the fixture
    // by accident and reports it as working.
    source: isDev(c.env) ? "fixture" : "supabase",
  }),
);

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
