-- Where a Merchant's photographs live.
--
-- Supabase Storage rather than R2, and the reason is authorisation rather than
-- price. The dashboard talks to Supabase as the signed-in merchant precisely so
-- that the policies are the authorisation; an upload to R2 would have to be
-- mediated by the Worker, which holds the service role, which means writing the
-- Account-scoping rules a second time in application code and getting them
-- right there too. Issue #2 said R2 on the grounds of "no new vendor" — but
-- Supabase is the vendor we already have, and R2 is the product not yet enabled.
--
-- The bucket is **private**. Nothing here is publicly addressable: the Worker
-- reads objects with the service role and serves them under its own hostname,
-- cached at the edge. So egress from Supabase scales with cache misses rather
-- than with page views, which was R2's real advantage, and a merchant moving to
-- a custom domain does not break every image.

insert into storage.buckets (id, name, public)
values ('merchant-media', 'merchant-media', false)
on conflict (id) do nothing;

-- The first path segment is the Merchant's slug: `<slug>/<name>-<width>.jpg`.
-- Membership of the Account that owns that slug is what grants access, which is
-- the same rule the `merchants` table already uses.
create or replace function public.owns_media_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.merchants m
    where m.slug = (storage.foldername(object_name))[1]
      and public.is_account_member(m.account_id)
  );
$$;

create policy "members read their own merchant media"
  on storage.objects for select to authenticated
  using (bucket_id = 'merchant-media' and public.owns_media_path(name));

create policy "members upload their own merchant media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'merchant-media' and public.owns_media_path(name));

create policy "members replace their own merchant media"
  on storage.objects for update to authenticated
  using (bucket_id = 'merchant-media' and public.owns_media_path(name))
  with check (bucket_id = 'merchant-media' and public.owns_media_path(name));

create policy "members delete their own merchant media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'merchant-media' and public.owns_media_path(name));

-- No policy for `anon`: the bucket is private and the Worker is the only reader
-- that serves it onward.
