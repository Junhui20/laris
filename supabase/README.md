# Database

Migrations are the definition of the database. Applying them in filename order
to an empty Supabase project must reproduce it exactly — that is what makes the
schema reviewable and what lets the other maintainer work without being handed
credentials.

## Applying

Paste the migration into the SQL editor of the Supabase project
(**SQL Editor → New query**) and run it, or with the CLI:

```bash
supabase db push
```

## Rules

- **`@laris/schema` is the source of truth.** The Business Profile is stored as
  one JSONB document because that is what the Zod schema is. The `vertical` and
  `state` columns are `GENERATED` from the document rather than copied, so they
  cannot drift from it.
- **RLS ships with the table, never after it.** A table added without a policy
  in the same migration is a table that was briefly readable by everyone.
- **`anon` is revoked, not merely policy-less.** Merchant Sites are rendered by
  the Worker under the service role; the browser is not a client of this
  database. Revoking survives someone later adding a permissive policy.
- **The service role key bypasses RLS entirely.** It belongs in
  `wrangler secret put` and a gitignored `.env`, nowhere else — not in
  `wrangler.toml`, not in a PR, not in an issue.
