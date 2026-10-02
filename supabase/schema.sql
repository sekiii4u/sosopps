-- Social Ops schema. Run once in the Supabase SQL Editor.
-- Anonymous teammates can read/create/update operational rows; DELETE is intentionally server-only.
create extension if not exists pgcrypto;

create table if not exists public.clients (
  id text primary key,
  name text not null,
  contact text,
  daily_target integer not null default 0 check (daily_target >= 0),
  status text not null default 'Active',
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.platforms (
  id text primary key,
  name text not null unique,
  active boolean not null default true,
  color text not null default '#536fe4',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id text primary key,
  name text not null,
  type text not null default 'Other',
  assigned_to text,
  status text not null default 'Active',
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id text primary key,
  client_id text not null references public.clients(id) on delete restrict,
  platform_id text not null references public.platforms(id) on delete restrict,
  name text not null,
  device_id text references public.devices(id) on delete set null,
  phone text,
  email text,
  status text not null default 'Active',
  daily_target integer not null default 0 check (daily_target >= 0),
  remarks text,
  created_at timestamptz not null default now(),
  unique (platform_id, name)
);

create table if not exists public.posts (
  id text primary key,
  post_date date not null,
  post_time time not null,
  client_id text not null references public.clients(id) on delete restrict,
  account_id text not null references public.accounts(id) on delete restrict,
  platform_id text not null references public.platforms(id) on delete restrict,
  device_id text references public.devices(id) on delete set null,
  content_id text,
  content_type text not null default 'Video',
  status text not null check (status in ('Published', 'Failed', 'Pending', 'Scheduled', 'Cancelled')),
  operator text,
  url text,
  remark text,
  created_at timestamptz not null default now()
);

create index if not exists posts_posted_date_time_idx on public.posts (post_date desc, post_time desc);
create index if not exists posts_client_id_idx on public.posts (client_id);
create index if not exists posts_platform_id_idx on public.posts (platform_id);
create index if not exists accounts_client_id_idx on public.accounts (client_id);

-- Private server-side failure counter for password-guessing protection.
create table if not exists public.delete_attempt_limits (
  client_ip text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);
alter table public.delete_attempt_limits enable row level security;
revoke all on public.delete_attempt_limits from anon, authenticated;
grant all on public.delete_attempt_limits to service_role;

create or replace function public.delete_ip_is_blocked(p_client_ip text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce((select blocked_until > now() from public.delete_attempt_limits where client_ip = p_client_ip), false);
$$;

create or replace function public.record_failed_delete(p_client_ip text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.delete_attempt_limits (client_ip, attempts, window_started_at)
  values (p_client_ip, 1, now())
  on conflict (client_ip) do update set
    attempts = case
      when public.delete_attempt_limits.window_started_at < now() - interval '15 minutes' then 1
      else public.delete_attempt_limits.attempts + 1
    end,
    window_started_at = case
      when public.delete_attempt_limits.window_started_at < now() - interval '15 minutes' then now()
      else public.delete_attempt_limits.window_started_at
    end,
    blocked_until = case
      when public.delete_attempt_limits.window_started_at < now() - interval '15 minutes' then null
      when public.delete_attempt_limits.attempts + 1 >= 5 then now() + interval '15 minutes'
      else public.delete_attempt_limits.blocked_until
    end;
end;
$$;

create or replace function public.clear_delete_attempts(p_client_ip text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.delete_attempt_limits where client_ip = p_client_ip;
$$;

revoke all on function public.delete_ip_is_blocked(text) from public, anon, authenticated;
revoke all on function public.record_failed_delete(text) from public, anon, authenticated;
revoke all on function public.clear_delete_attempts(text) from public, anon, authenticated;
grant execute on function public.delete_ip_is_blocked(text), public.record_failed_delete(text), public.clear_delete_attempts(text) to service_role;

alter table public.clients enable row level security;
alter table public.platforms enable row level security;
alter table public.devices enable row level security;
alter table public.accounts enable row level security;
alter table public.posts enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['clients', 'platforms', 'devices', 'accounts', 'posts'] loop
    execute format('drop policy if exists "public read" on public.%I', table_name);
    execute format('drop policy if exists "public insert" on public.%I', table_name);
    execute format('drop policy if exists "public update" on public.%I', table_name);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', table_name);
    execute format('create policy "public insert" on public.%I for insert to anon, authenticated with check (true)', table_name);
    execute format('create policy "public update" on public.%I for update to anon, authenticated using (true) with check (true)', table_name);
  end loop;
end $$;

-- PostgREST permissions: no DELETE grant for anon/authenticated clients.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.clients, public.platforms, public.devices, public.accounts, public.posts to anon, authenticated;
revoke delete on public.clients, public.platforms, public.devices, public.accounts, public.posts from anon, authenticated;
