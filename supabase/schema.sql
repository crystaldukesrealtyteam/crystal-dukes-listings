-- Crystal Dukes Realty Team Listings Platform
-- Run this in Supabase SQL Editor before connecting the website.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('admin'))
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  address text not null,
  city text not null,
  state text not null default 'AL',
  zip text,
  price numeric(12,2),
  bedrooms numeric(4,1),
  bathrooms numeric(4,1),
  sqft integer,
  status text not null default 'active' check (status in ('active','under_contract','sold')),
  description text,
  photos text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_published_idx on public.properties(published);
create index if not exists properties_created_at_idx on public.properties(created_at desc);

create or replace function public.is_listings_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;

drop policy if exists "Admins can read own profile" on public.profiles;
create policy "Admins can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Public can view published properties" on public.properties;
create policy "Public can view published properties"
on public.properties for select
to anon, authenticated
using (published = true);

drop policy if exists "Admins can view all properties" on public.properties;
create policy "Admins can view all properties"
on public.properties for select
to authenticated
using (public.is_listings_admin());

drop policy if exists "Admins can insert properties" on public.properties;
create policy "Admins can insert properties"
on public.properties for insert
to authenticated
with check (public.is_listings_admin());

drop policy if exists "Admins can update properties" on public.properties;
create policy "Admins can update properties"
on public.properties for update
to authenticated
using (public.is_listings_admin())
with check (public.is_listings_admin());

drop policy if exists "Admins can delete properties" on public.properties;
create policy "Admins can delete properties"
on public.properties for delete
to authenticated
using (public.is_listings_admin());

-- Public image bucket. Property visibility is controlled by the properties table.
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public can view property photos" on storage.objects;
create policy "Public can view property photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'property-photos');

drop policy if exists "Admins can upload property photos" on storage.objects;
create policy "Admins can upload property photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-photos' and public.is_listings_admin());

drop policy if exists "Admins can update property photos" on storage.objects;
create policy "Admins can update property photos"
on storage.objects for update
to authenticated
using (bucket_id = 'property-photos' and public.is_listings_admin())
with check (bucket_id = 'property-photos' and public.is_listings_admin());

drop policy if exists "Admins can delete property photos" on storage.objects;
create policy "Admins can delete property photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'property-photos' and public.is_listings_admin());

-- After creating both user accounts in Supabase Authentication > Users,
-- insert their UUIDs here. Replace the sample values; do not share passwords.
-- insert into public.profiles (id, email, role)
-- values ('USER-UUID-FOR-DWAYNE', 'your-email@example.com', 'admin'),
--        ('USER-UUID-FOR-CRYSTAL', 'crystal-email@example.com', 'admin');
