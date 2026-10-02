-- Social Ops schema. Run once in the Supabase SQL Editor.
-- Access requires an authenticated role profile; clients are scoped to their own client data.
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
  daily_target integer not null default 0 check (daily_target >= 0),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.platforms add column if not exists daily_target integer not null default 0 check (daily_target >= 0);

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

-- Upgrade installations that used the earlier posted_at timestamp column.
alter table public.posts add column if not exists post_date date;
alter table public.posts add column if not exists post_time time;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'posted_at'
  ) then
    execute 'update public.posts set post_date = coalesce(post_date, posted_at::date), post_time = coalesce(post_time, posted_at::time)';
    execute 'alter table public.posts alter column posted_at drop not null';
  end if;
  update public.posts set post_date = coalesce(post_date, created_at::date), post_time = coalesce(post_time, time '00:00');
  alter table public.posts alter column post_date set not null;
  alter table public.posts alter column post_time set not null;
end $$;

create index if not exists posts_posted_date_time_idx on public.posts (post_date desc, post_time desc);
create index if not exists posts_client_id_idx on public.posts (client_id);
create index if not exists posts_platform_id_idx on public.posts (platform_id);
create index if not exists accounts_client_id_idx on public.accounts (client_id);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role text not null check (role in ('admin', 'client')),
  client_id text references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((role = 'admin' and client_id is null) or (role = 'client' and client_id is not null))
);
alter table public.profiles enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_client_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select client_id from public.profiles where id = auth.uid() and role = 'client';
$$;

create or replace function public.client_can_write_post(p_client_id text, p_account_id text, p_platform_id text, p_device_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_client_id = public.current_client_id() and exists (
    select 1 from public.accounts a
    where a.id = p_account_id and a.client_id = p_client_id and a.platform_id = p_platform_id
      and a.device_id is not distinct from p_device_id
  );
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.current_client_id() from public, anon;
revoke all on function public.client_can_write_post(text, text, text, text) from public, anon;
grant execute on function public.current_app_role(), public.current_client_id(), public.client_can_write_post(text, text, text, text) to authenticated;

insert into public.platforms (id, name, active, color, daily_target, notes) values
  ('PLT-001', 'Instagram', true, '#d94e8f', 15, 'Meta'),
  ('PLT-002', 'TikTok', true, '#1d222a', 10, 'Short form video'),
  ('PLT-003', 'Facebook', true, '#4d79df', 7, 'Meta'),
  ('PLT-004', 'YouTube', true, '#ea5555', 3, 'Video channel'),
  ('PLT-005', 'X', false, '#69727f', 0, 'Not currently used')
on conflict (name) do update set daily_target = excluded.daily_target
where public.platforms.daily_target = 0;

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
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists "profile owner can read" on public.profiles;
create policy "profile owner can read" on public.profiles for select to authenticated using (id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array['clients', 'platforms', 'devices', 'accounts', 'posts'] loop
    execute format('drop policy if exists "public read" on public.%I', table_name);
    execute format('drop policy if exists "public insert" on public.%I', table_name);
    execute format('drop policy if exists "public update" on public.%I', table_name);
    execute format('drop policy if exists "admin full access" on public.%I', table_name);
    execute format('drop policy if exists "client scoped read" on public.%I', table_name);
    execute format('drop policy if exists "client insert own posts" on public.%I', table_name);
    execute format('drop policy if exists "client update own posts" on public.%I', table_name);
  end loop;
end $$;

create policy "admin full access" on public.clients for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "client scoped read" on public.clients for select to authenticated using (id = public.current_client_id());
create policy "admin full access" on public.platforms for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "client scoped read" on public.platforms for select to authenticated using (exists (select 1 from public.accounts a where a.client_id = public.current_client_id() and a.platform_id = platforms.id));
create policy "admin full access" on public.devices for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "client scoped read" on public.devices for select to authenticated using (exists (select 1 from public.accounts a where a.client_id = public.current_client_id() and a.device_id = devices.id));
create policy "admin full access" on public.accounts for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "client scoped read" on public.accounts for select to authenticated using (client_id = public.current_client_id());
create policy "admin full access" on public.posts for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "client scoped read" on public.posts for select to authenticated using (client_id = public.current_client_id());
create policy "client insert own posts" on public.posts for insert to authenticated with check (public.client_can_write_post(client_id, account_id, platform_id, device_id));
create policy "client update own posts" on public.posts for update to authenticated using (client_id = public.current_client_id()) with check (public.client_can_write_post(client_id, account_id, platform_id, device_id));

-- No anonymous table access. Authenticated admins and clients can read the rows allowed by RLS.
grant usage on schema public to authenticated, service_role;
revoke all on public.clients, public.platforms, public.devices, public.accounts, public.posts from anon, authenticated;
grant select, insert, update, delete on public.clients, public.platforms, public.devices, public.accounts, public.posts to authenticated;
grant all on public.profiles to service_role;
revoke all on public.profiles from anon;
