-- Laris · phase 00 · accounts, merchants, and the Business Profile.
--
-- Three rules this file exists to enforce:
--
--   1. `@laris/schema` is the source of truth. The Business Profile is stored
--      as one JSONB document because that is what the Zod schema is; splitting
--      it into columns would mean two schemas to keep in agreement and a
--      migration for every field the product adds. The columns that do exist
--      are GENERATED from the document, so the two cannot disagree.
--   2. Row-level security from the first migration, not bolted on. A merchant
--      reads and writes their own rows and nobody else's.
--   3. The browser never reaches this database. Merchant Sites are rendered by
--      the Worker with the service role; `anon` is revoked outright rather than
--      merely policy-less, so a future policy mistake cannot expose it.

-- ── accounts ────────────────────────────────────────────────────────────────
-- Who we bill and who the brand belongs to. For a single-location business
-- this layer is invisible; it exists because one owner can hold several
-- Merchants, and a Merchant is one location.

create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  brand_name  text not null check (length(brand_name) between 1 and 200),
  -- Distilled from the owner's own writing, never invented. See CONTEXT.md.
  tone        text,
  whatsapp    text not null,
  languages   text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ── account_members ─────────────────────────────────────────────────────────
-- The link RLS needs: which Supabase user may act for which Account. Without
-- it "their own rows" has no definition.

create table public.account_members (
  account_id  uuid not null references public.accounts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'editor')),
  created_at  timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index account_members_user_idx on public.account_members (user_id);

-- ── merchants ───────────────────────────────────────────────────────────────
-- One row per location. One location = one Google Business Profile card =
-- one Malaysian state, because the state decides both the public holidays and
-- the weekend group (Kedah, Kelantan and Terengganu rest Friday–Saturday).
-- A business in two states is two Merchants under one Account.

create table public.merchants (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts (id) on delete cascade,

  -- Subdomain label for the Merchant Site, and the key the Worker looks up by.
  -- Not in the document because it is addressing, not a fact about the business.
  slug              text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  custom_domain     text unique,

  business_context  jsonb not null,

  -- Generated, not copied. A column that mirrors the document by hand drifts
  -- from it the first time someone writes one and forgets the other.
  vertical          text generated always as (business_context ->> 'vertical') stored,
  state             text generated always as (business_context -> 'identity' ->> 'state') stored,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- The document must agree with the row it lives in. Cheap to check here,
  -- and the alternative is discovering a mismatched id inside a template.
  --
  -- Each one tests `is not null` first on purpose: a missing key makes `->>`
  -- return NULL, and a CHECK that evaluates to NULL passes. Without that half
  -- a document with no `vertical` at all would be accepted by the constraint
  -- meant to police `vertical`.
  constraint merchants_context_id_agrees
    check (business_context ->> 'merchantId' is not null
           and business_context ->> 'merchantId' = id::text),
  constraint merchants_context_account_agrees
    check (business_context ->> 'accountId' is not null
           and business_context ->> 'accountId' = account_id::text),
  constraint merchants_vertical_known
    check (business_context ->> 'vertical' is not null
           and business_context ->> 'vertical' in ('fnb', 'stay', 'retail', 'service')),
  constraint merchants_state_known
    check (business_context -> 'identity' ->> 'state' is not null
           and business_context -> 'identity' ->> 'state' in (
             'johor', 'kedah', 'kelantan', 'melaka', 'negeri-sembilan', 'pahang',
             'perak', 'perlis', 'pulau-pinang', 'sabah', 'sarawak', 'selangor',
             'terengganu', 'kuala-lumpur', 'labuan', 'putrajaya'
           ))
);

create index merchants_account_idx on public.merchants (account_id);

-- `updated_at` is the row's own clock — audit metadata, not the concurrency
-- token. See the later migration: the write path matches on the document's own
-- `updatedAt`, and two timestamps both presented as authoritative is how one of
-- them quietly stops being true.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchants_touch_updated_at
  before update on public.merchants
  for each row execute function public.touch_updated_at();

-- ── row-level security ──────────────────────────────────────────────────────

alter table public.accounts        enable row level security;
alter table public.account_members enable row level security;
alter table public.merchants       enable row level security;

-- SECURITY DEFINER on purpose: a policy on `merchants` has to read
-- `account_members`, which is itself protected. Reading it through a definer
-- function is how that stays one lookup instead of a policy that recurses.
-- `search_path = ''` so a schema on the caller's path cannot shadow the table.
create or replace function public.is_account_member(target_account uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_members m
    where m.account_id = target_account
      and m.user_id = (select auth.uid())
  );
$$;

create policy accounts_read_own on public.accounts
  for select to authenticated
  using (public.is_account_member(id));

create policy accounts_update_own on public.accounts
  for update to authenticated
  using (public.is_account_member(id))
  with check (public.is_account_member(id));

create policy account_members_read_own on public.account_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_account_member(account_id));

create policy merchants_read_own on public.merchants
  for select to authenticated
  using (public.is_account_member(account_id));

create policy merchants_insert_own on public.merchants
  for insert to authenticated
  with check (public.is_account_member(account_id));

create policy merchants_update_own on public.merchants
  for update to authenticated
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- Deliberately no DELETE policy and no INSERT policy on `accounts`: creating
-- and destroying an Account is an onboarding action, not something a session
-- token should be able to do. Both run through the service role.

-- ── the browser is not a client of this database ────────────────────────────
-- Merchant Sites are edge-rendered by the Worker under the service role, so
-- `anon` has no legitimate reason to read any of this. Revoking is stronger
-- than having no policy: it survives someone later adding a permissive one.

revoke all on public.accounts        from anon;
revoke all on public.account_members from anon;
revoke all on public.merchants       from anon;
