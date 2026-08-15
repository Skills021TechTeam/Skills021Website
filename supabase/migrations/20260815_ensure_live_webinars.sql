-- Skills021: ensure the live webinar table exists.
-- Run this migration in Supabase SQL Editor if the database was created
-- before the webinar feature was added.
create extension if not exists pgcrypto;

create table if not exists public.live_webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  provider text not null check (provider in ('Google Meet', 'Zoom')),
  join_url text not null,
  starts_at timestamptz not null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint live_webinars_time_check
    check (ends_at is null or ends_at > starts_at)
);

create index if not exists live_webinars_start_idx
  on public.live_webinars (starts_at desc);

alter table public.live_webinars enable row level security;

drop policy if exists "live_webinars_read" on public.live_webinars;
drop policy if exists "live_webinars_insert" on public.live_webinars;
drop policy if exists "live_webinars_update" on public.live_webinars;
drop policy if exists "live_webinars_delete" on public.live_webinars;

create policy "live_webinars_read"
  on public.live_webinars for select using (true);

create policy "live_webinars_insert"
  on public.live_webinars for insert with check (true);

create policy "live_webinars_update"
  on public.live_webinars for update using (true) with check (true);

create policy "live_webinars_delete"
  on public.live_webinars for delete using (true);

grant select, insert, update, delete
  on public.live_webinars to anon, authenticated;

-- Tell PostgREST to reload its schema cache immediately.
notify pgrst, 'reload schema';
