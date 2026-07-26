-- Run this file in the Supabase SQL editor before using the auth UI.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'collector'
    check (role in ('artisan', 'collector', 'operator', 'admin')),
  first_name text not null default '',
  last_name text not null default '',
  city text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, first_name, last_name, city)
  values (
    new.id,
    case
      when requested_role in ('artisan', 'collector', 'operator') then requested_role
      else 'collector'
    end,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'city', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete
on public.profiles for delete
using (public.is_admin());

-- Users can update their own profile (name, city) but cannot change role
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select role from public.profiles where id = auth.uid())
);

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD'
    check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists artworks_set_updated_at on public.artworks;
create trigger artworks_set_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();

alter table public.artworks enable row level security;
drop policy if exists artworks_select_public_or_owner on public.artworks;
create policy artworks_select_public_or_owner
on public.artworks for select
using (status = 'published' or artisan_id = auth.uid() or public.is_admin());

drop policy if exists artworks_insert_as_artisan on public.artworks;
create policy artworks_insert_as_artisan
on public.artworks for insert
with check (
  artisan_id = auth.uid()
  and status = 'draft'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'artisan'
  )
);

drop policy if exists artworks_update_owner_or_admin on public.artworks;
create policy artworks_update_owner_or_admin
on public.artworks for update
using (
  public.is_admin()
  or artisan_id = auth.uid()
)
with check (
  public.is_admin()
  or (artisan_id = auth.uid() and status in ('draft', 'archived', 'published'))
);

drop policy if exists artworks_delete_owner_or_admin on public.artworks;
create policy artworks_delete_owner_or_admin
on public.artworks for delete
using (public.is_admin() or (artisan_id = auth.uid() and status <> 'published'));

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null unique references public.artworks(id) on delete cascade,
  certificate_number text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now()
);

alter table public.certificates enable row level security;
drop policy if exists certificates_select_public_or_owner on public.certificates;
create policy certificates_select_public_or_owner
on public.certificates for select
using (
  public.is_admin()
  or exists (
    select 1 from public.artworks
    where artworks.id = certificates.artwork_id
      and (artworks.status = 'published' or artworks.artisan_id = auth.uid())
  )
);

drop policy if exists certificates_admin_insert on public.certificates;
create policy certificates_admin_insert
on public.certificates for insert
with check (public.is_admin());

drop policy if exists certificates_admin_update on public.certificates;
create policy certificates_admin_update
on public.certificates for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists certificates_admin_delete on public.certificates;
create policy certificates_admin_delete
on public.certificates for delete
using (public.is_admin());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  artwork_id uuid not null references public.artworks(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD'
    check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  payment_reference text unique,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
drop policy if exists orders_select_participant_or_admin on public.orders;
create policy orders_select_participant_or_admin
on public.orders for select
using (
  public.is_admin()
  or buyer_id = auth.uid()
  or exists (
    select 1 from public.artworks
    where artworks.id = orders.artwork_id
      and artworks.artisan_id = auth.uid()
  )
);

-- Authenticated users can create orders as themselves
drop policy if exists orders_insert_self on public.orders;
create policy orders_insert_self
on public.orders for insert
with check (
  buyer_id = auth.uid()
  and status = 'pending'
  and amount_cents > 0
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
drop policy if exists events_select_published_or_admin on public.events;
create policy events_select_published_or_admin
on public.events for select
using (status = 'published' or public.is_admin());

drop policy if exists events_admin_insert on public.events;
create policy events_admin_insert
on public.events for insert
with check (public.is_admin());

drop policy if exists events_admin_update on public.events;
create policy events_admin_update
on public.events for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists events_admin_delete on public.events;
create policy events_admin_delete
on public.events for delete
using (public.is_admin());

-- Newsletter subscriptions
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Anyone can subscribe (including anonymous users)
drop policy if exists newsletter_insert_public on public.newsletter_subscribers;
create policy newsletter_insert_public
on public.newsletter_subscribers for insert
with check (true);

-- Only admins can see the list
drop policy if exists newsletter_select_admin on public.newsletter_subscribers;
create policy newsletter_select_admin
on public.newsletter_subscribers for select
using (public.is_admin());
