/**
 * Types for the tables `refresh-calendar-data.mjs` exports so a test can check
 * them against `StateCode`. The script itself is plain node on purpose: it runs
 * before anything is built.
 */
export declare const LARIS_BY_MYCAL_CODE: ReadonlyMap<string, string>;
export declare function unmappedStateTokens(tokens: readonly string[]): string[];
