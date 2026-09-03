import type { Identity, Mismatch } from "@laris/schema";
import { compareIdentity } from "./compare.js";
import { extractIdentity } from "./extract.js";
import type { FetchedPage } from "./fetch.js";

/** Pure Issue #1 boundary: fetched Channel page + Profile identity → certain drift. */
export function driftCheck(fetchedPage: FetchedPage, identity: Identity): Mismatch[] {
  return compareIdentity(extractIdentity(fetchedPage.html), identity);
}
