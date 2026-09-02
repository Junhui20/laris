-- `array_length(x, 1)` returns NULL for an empty array, not 0 — and a CHECK
-- that evaluates to NULL passes. So the constraint added one migration ago let
-- `languages = '{}'` straight through, which is precisely the case it existed
-- to stop.
--
-- This is the second time in this schema. The first migration's comment already
-- says it: "a missing key makes `->>` return NULL, and a CHECK that evaluates
-- to NULL passes". Writing it down was not enough; the constraint has to be
-- written so the NULL cannot arise.
--
-- `cardinality()` returns 0 for an empty array. A live test now covers both the
-- empty list and an unknown language, and the positive case as well.

alter table public.accounts drop constraint if exists accounts_languages_known;

alter table public.accounts
  add constraint accounts_languages_known check (
    cardinality(languages) >= 1
    and languages <@ array['ms', 'en', 'zh']::text[]
  );
