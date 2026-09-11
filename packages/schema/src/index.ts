/**
 * @laris/schema — the single source of truth for Laris's domain shapes.
 *
 * Terms are defined in CONTEXT.md; use them exactly. Python's Pydantic models
 * are generated from here, never hand-written, so this file is the only place
 * a shape may change.
 */
export * from "./common.js";
export * from "./business-context.js";
export * from "./content.js";
export * from "./drift.js";
export * as stay from "./verticals/stay.js";
