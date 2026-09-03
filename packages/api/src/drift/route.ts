import { Mismatch } from "@laris/schema";
import { Hono } from "hono";
import { type Env, getBusinessContext } from "../repo/merchant.js";
import { driftCheck } from "./drift-check.js";
import { DriftFetchError, fetchPage } from "./fetch.js";

export const driftRoutes = new Hono<{ Bindings: Env }>();

driftRoutes.post("/merchants/:slug/drift-check", async (c) => {
  const body = await readRequestBody(c.req.raw);
  if (!body) return c.json({ error: "body must be JSON with a string url" }, 400);

  const ctx = await getBusinessContext(c.env, c.req.param("slug"), {
    allowFixture: !c.env.SUPABASE_URL,
  });
  if (!ctx) return c.json({ error: "not found" }, 404);

  try {
    const page = await fetchPage(body.url);
    const mismatches = Mismatch.array().parse(driftCheck(page, ctx.identity));
    return c.json({ mismatches });
  } catch (error) {
    if (!(error instanceof DriftFetchError)) throw error;
    return c.json({ error: error.message, code: error.code }, statusForFetchError(error));
  }
});

async function readRequestBody(request: Request): Promise<{ url: string } | null> {
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("url" in body) ||
      typeof body.url !== "string"
    ) {
      return null;
    }
    return { url: body.url };
  } catch {
    return null;
  }
}

function statusForFetchError(error: DriftFetchError): 400 | 422 | 502 {
  switch (error.code) {
    case "invalid_url":
    case "unsafe_url":
      return 400;
    case "not_html":
    case "too_large":
      return 422;
    case "redirect_limit":
    case "upstream_error":
      return 502;
  }
}
