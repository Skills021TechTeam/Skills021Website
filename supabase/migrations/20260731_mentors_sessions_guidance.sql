-- ============================================================================
-- Skills021 — Mentorship migration
-- Run this ONCE in Supabase → SQL Editor.
--
-- Moves the Mentorship section (mentors, mentor sessions, guidance requests)
-- from browser-only localStorage into real Supabase tables, the same way
-- site_courses / resources already work. This means:
--   • Mentors the admin adds/edits/publishes are visible to every visitor,
--     not just the admin's own browser.
--   • Guidance requests submitted by students on the public Mentorship page
--     actually reach the admin, from any device.
-- Follows the same conventions as your existing tables: uuid primary keys,
-- permissive RLS (this app authenticates via the anon key, not Supabase
-- Auth, and enforces "admin" checks in the frontend), explicit grants.
-- Safe to run more than once.
-- ============================================================================

-- 1) mentors ------------------------------------------------------------------
create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null default '',
  company text not null default '',
  expertise text[] not null default '{}',
  experience text not null default '',
  rating numeric not null default 5,
  reviews int not null default 0,
  sessions int not null default 0,
  photo text,
  bio text not null default '',
  services text[] not null default '{}',
  fees jsonb not null default '{}'::jsonb,
  linked_in text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

create index if not exists mentors_status_idx on public.mentors (status);

-- 2) mentor_sessions ------------------------------------------------------------
create table if not exists public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_email text not null default '',
  mentor_id uuid references public.mentors(id) on delete set null,
  service_type text not null default 'Career Guidance',
  session_date text not null default '',
  session_time text not null default '',
  duration text not null default '',
  fee numeric not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists mentor_sessions_mentor_idx on public.mentor_sessions (mentor_id);

-- 3) guidance_requests ----------------------------------------------------------
create table if not exists public.guidance_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  city text not null default '',
  state text not null default '',
  class_year text not null default '',
  school_college text not null default '',
  board_university text not null default '',
  stream text not null default '',
  percentage text not null default '',
  guidance_types text[] not null default '{}',
  preferred_mentors text[] not null default '{}',
  additional_query text not null default '',
  status text not null default 'New' check (status in ('New', 'In Progress', 'Contacted', 'Completed')),
  created_at timestamptz not null default now()
);

create index if not exists guidance_requests_status_idx on public.guidance_requests (status);

-- 4) Storage bucket for mentor photos --------------------------------------------
insert into storage.buckets (id, name, public)
values ('mentor-photos', 'mentor-photos', true)
on conflict (id) do nothing;

drop policy if exists "mentor_photos_read" on storage.objects;
drop policy if exists "mentor_photos_write" on storage.objects;
drop policy if exists "mentor_photos_update" on storage.objects;
drop policy if exists "mentor_photos_delete" on storage.objects;
create policy "mentor_photos_read"   on storage.objects for select using (bucket_id = 'mentor-photos');
create policy "mentor_photos_write"  on storage.objects for insert with check (bucket_id = 'mentor-photos');
create policy "mentor_photos_update" on storage.objects for update using (bucket_id = 'mentor-photos');
create policy "mentor_photos_delete" on storage.objects for delete using (bucket_id = 'mentor-photos');

-- 5) RLS ---------------------------------------------------------------------
alter table public.mentors            enable row level security;
alter table public.mentor_sessions    enable row level security;
alter table public.guidance_requests  enable row level security;

drop policy if exists "mentors_read"   on public.mentors;
drop policy if exists "mentors_insert" on public.mentors;
drop policy if exists "mentors_update" on public.mentors;
drop policy if exists "mentors_delete" on public.mentors;
create policy "mentors_read"   on public.mentors for select using (true);
create policy "mentors_insert" on public.mentors for insert with check (true);
create policy "mentors_update" on public.mentors for update using (true) with check (true);
create policy "mentors_delete" on public.mentors for delete using (true);

drop policy if exists "mentor_sessions_read"   on public.mentor_sessions;
drop policy if exists "mentor_sessions_insert" on public.mentor_sessions;
drop policy if exists "mentor_sessions_update" on public.mentor_sessions;
drop policy if exists "mentor_sessions_delete" on public.mentor_sessions;
create policy "mentor_sessions_read"   on public.mentor_sessions for select using (true);
create policy "mentor_sessions_insert" on public.mentor_sessions for insert with check (true);
create policy "mentor_sessions_update" on public.mentor_sessions for update using (true) with check (true);
create policy "mentor_sessions_delete" on public.mentor_sessions for delete using (true);

drop policy if exists "guidance_requests_read"   on public.guidance_requests;
drop policy if exists "guidance_requests_insert" on public.guidance_requests;
drop policy if exists "guidance_requests_update" on public.guidance_requests;
drop policy if exists "guidance_requests_delete" on public.guidance_requests;
create policy "guidance_requests_read"   on public.guidance_requests for select using (true);
create policy "guidance_requests_insert" on public.guidance_requests for insert with check (true);
create policy "guidance_requests_update" on public.guidance_requests for update using (true) with check (true);
create policy "guidance_requests_delete" on public.guidance_requests for delete using (true);

-- 6) Grants ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.mentors           to anon, authenticated;
grant select, insert, update, delete on public.mentor_sessions   to anon, authenticated;
grant select, insert, update, delete on public.guidance_requests to anon, authenticated;
