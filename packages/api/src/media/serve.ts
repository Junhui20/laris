import type { Env } from "../repo/merchant.js";

/**
 * Serving a Merchant's photographs.
 *
 * The bucket is private, so nothing is publicly addressable at Supabase. The
 * Worker reads objects with the service role and hands them out under the
 * Merchant's own hostname, cached at the edge — which is why Supabase Storage
 * costs nothing that R2 would have saved: egress scales with cache misses, not
 * with page views, and the merchant's URLs stay theirs when they move domain.
 *
 * Object keys are minted at upload with a random suffix, so a given URL always
 * names the same bytes and can be cached hard.
 */

const BUCKET = "merchant-media";

/** The shape `Photo.key` enforces, plus the width suffix the template asks for. */
const OBJECT = /^[a-z0-9][a-z0-9._/-]{2,120}-\d{2,5}\.jpg$/;

export async function serveMedia(env: Env, path: string): Promise<Response> {
  // Reject before spending a round trip. A path that cannot be a Photo key is
  // not a miss, it is a probe.
  if (!OBJECT.test(path) || path.split("/").includes("..")) {
    return new Response("not found", { status: 404 });
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("media is not configured", { status: 503 });
  }

  const upstream = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });

  if (!upstream.ok) {
    return new Response("not found", { status: upstream.status === 404 ? 404 : 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Immutable is honest here: the key carries a random suffix, so replacing
      // a photograph mints a new URL rather than changing what this one means.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
