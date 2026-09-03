import type { Photo } from "@laris/schema";

/**
 * The one place an asset key becomes a URL.
 *
 * The Business Profile stores a key, never a URL, so the same Profile can
 * compile a Merchant Site on one origin and a GBP listing that needs an
 * absolute address, and so a merchant moving to their own domain changes the
 * origin rather than every photo they own.
 *
 * The width sits in the path rather than a query string: cacheable at the edge
 * with no `Vary`, and a missing variant is a 404 rather than a silent
 * full-size serve. It is `-<width>` and not `@<width>` because Cloudflare's
 * static asset server percent-encodes `@` and answers 307, which would cost a
 * redirect on every image.
 */
export function photoUrl(origin: string, photo: Photo, width: number): string {
  return `${origin}/m/${photo.key}-${width}.jpg`;
}

/** Every stored variant, for the browser to choose from. */
export function photoSrcSet(origin: string, photo: Photo): string {
  return photo.widths.map((width) => `${photoUrl(origin, photo, width)} ${width}w`).join(", ");
}

/** The largest variant — what a Channel that cannot express a srcset gets. */
export function largestPhotoUrl(origin: string, photo: Photo): string {
  return photoUrl(origin, photo, Math.max(...photo.widths));
}
