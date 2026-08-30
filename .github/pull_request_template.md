## What this changes

<!-- One paragraph. What behaviour is different after this merges? -->

## Why

<!-- Link the issue. If there isn't one and this is non-trivial, open one first. -->

Closes #

## Checklist

- [ ] `pnpm check` and `pnpm test` pass
- [ ] One logical change (a rename *and* a feature is two PRs)
- [ ] No credentials in the diff — including in tests and fixtures

## If this adds a dependency

- **What does it replace?**
- **Install / bundle cost?** (hard constraint for anything on Workers)
- **What if it's abandoned?**

## If this touches `packages/schema`

- [ ] Changed Zod only; Python models regenerated, not hand-edited
- [ ] `schema_version` bumped if `content_dna` changed
- [ ] Existing rows can still be recomputed from retained raw artefacts

## If this adds or changes a vertical

- [ ] Defines what an **offering** is for this industry
- [ ] Defines what **`leads`** means for this industry
- [ ] Extends the vertical only — no new shared core fields
- [ ] Includes one realistic filled-in example from a real Malaysian business
