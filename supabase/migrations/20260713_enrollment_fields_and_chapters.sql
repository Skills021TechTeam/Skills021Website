-- ============================================================================
-- Skills021 — Additive fix-up migration
-- Run this ONCE in Supabase → SQL Editor.
--
-- Your project already has: enrollments, item_ratings, item_comments,
-- site_courses (from earlier migrations). This file does NOT recreate or
-- rename any of those — it only:
--   1) adds 3 missing columns to the existing `enrollments` table
--      (phone, amount, payment_status) needed by the Enroll form, and
--   2) creates ONE new table, `item_timestamps`, for video chapter markers,
--      since none of your existing tables cover that yet.
-- Safe to run more than once.
-- ============================================================================

-- 1) Add the missing columns to your existing enrollments table -------------
alter table public.enrollments add column if not exists phone text not null default '';
alter table public.enrollments add column if not exists amount numeric not null default 0;
alter table public.enrollments add column if not exists payment_status text not null default 'free';

-- Add the check constraint only if it doesn't already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_payment_status_check'
  ) then
    alter table public.enrollments
      add constraint enrollments_payment_status_check
      check (payment_status in ('pending', 'paid', 'free'));
  end if;
end $$;

-- 2) New table: item_timestamps (video chapter markers) ---------------------
-- Same naming/style as your existing item_ratings / item_comments tables.
create table if not exists public.item_timestamps (
  id uuid primary key default gen_random_uuid(),
  item_type text not null default 'course' check (item_type in ('course', 'video')),
  item_id text not null,
  time_seconds int not null,
  label text not null,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create index if not exists item_timestamps_item_idx on public.item_timestamps (item_type, item_id);

alter table public.item_timestamps enable row level security;

drop policy if exists "timestamps_read" on public.item_timestamps;
drop policy if exists "timestamps_insert" on public.item_timestamps;
drop policy if exists "timestamps_delete" on public.item_timestamps;
create policy "timestamps_read" on public.item_timestamps for select using (true);
create policy "timestamps_insert" on public.item_timestamps for insert with check (true);
create policy "timestamps_delete" on public.item_timestamps for delete using (true);

-- 3) Grants — matching the grant statements you already ran for the other
--    tables (your project uses the anon key directly, not Supabase Auth,
--    so these tables need explicit grants the same way enrollments/
--    item_ratings/item_comments/site_courses already do).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.enrollments      to anon, authenticated;
grant select, insert, update, delete on public.item_ratings     to anon, authenticated;
grant select, insert, delete         on public.item_comments    to anon, authenticated;
grant select, insert, delete         on public.item_timestamps  to anon, authenticated;

-- 4) Missing RLS policies ----------------------------------------------------
-- Your existing item_ratings/enrollments tables only had SELECT + INSERT
-- policies. Submitting a rating twice (or re-enrolling / marking an
-- enrollment paid) triggers an UPDATE, which RLS was silently blocking
-- with no UPDATE policy in place. Add them here.
drop policy if exists "ratings_update" on public.item_ratings;
create policy "ratings_update" on public.item_ratings for update using (true) with check (true);

drop policy if exists "enrollments_update" on public.enrollments;
create policy "enrollments_update" on public.enrollments for update using (true) with check (true);
