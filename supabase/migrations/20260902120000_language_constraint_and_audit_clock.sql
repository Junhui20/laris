-- Two corrections to the first migration, applied rather than edited: it is
-- already live, and a migration that has run is history.

-- ── 1. `accounts.languages` disagreed with `@laris/schema` ──────────────────
-- `Account.languages` is `z.array(Language).nonempty()` and `Language` is only
-- `ms | en | zh`. The column permitted an empty array — and defaulted to one —
-- and accepted any string at all. A row the database called valid could
-- therefore be impossible to parse as the shape the schema calls the source of
-- truth, which is the one thing the JSONB design is supposed to make impossible.

alter table public.accounts alter column languages drop default;

alter table public.accounts
  add constraint accounts_languages_known check (
    array_length(languages, 1) >= 1
    and languages <@ array['ms', 'en', 'zh']::text[]
  );

-- ── 2. There were two update clocks and the comment named the wrong one ─────
-- The write path's actual condition is
--
--     .eq("business_context->>updatedAt", expectedUpdatedAt)
--
-- so the token is the value inside the document, stamped by the Worker. The
-- row's `updated_at` is maintained by a trigger and was described here as the
-- concurrency token. It is not, and the live test that watched it move was
-- testing an audit timestamp.
--
-- The document token stays: it is what the caller reads and what it must send
-- back, it survives being carried through an API response, and it does not
-- depend on the database and the application agreeing about a clock. Row
-- `updated_at` is audit metadata — when the row last changed, for anyone
-- looking at the table.

comment on column public.merchants.updated_at is
  'Audit only: when this row last changed. NOT the concurrency token — the write '
  'path matches on business_context->>updatedAt, which is what a caller reads and '
  'must send back. Do not add a second authority for the same question.';

comment on column public.merchants.business_context is
  'The Business Profile, as @laris/schema defines it. Its `updatedAt` is the '
  'optimistic-concurrency token: a write carries the value it read and matches on '
  'it, so two editors cannot silently overwrite each other.';
