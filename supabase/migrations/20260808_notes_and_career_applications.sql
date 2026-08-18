-- ============================================================================
-- Skills021 — Additive migration
-- Run this ONCE in Supabase → SQL Editor. Safe to run more than once.
--
-- This file does NOT touch any existing tables (aside from one additive
-- column below) — it creates two new tables and links courses to notes:
--   1) item_notes           — private, per-student notes taken while watching
--                              a course video (Courses panel → video player).
--   2) career_applications  — submissions from the new "Apply Now" job /
--                              internship application form.
--   3) resumes storage bucket — for uploaded resume files on the Apply form.
--
-- NOTE: course ⇄ notes linking no longer needs a schema change — the app
-- matches a course's Notes automatically by comparing the course Title to
-- the Resources panel's Subject name (both already-existing text fields),
-- so no ALTER TABLE on site_courses is required.
-- ============================================================================

-- 1) item_notes ---------------------------------------------------------------
-- Same naming/style as the existing item_ratings / item_comments / item_timestamps
-- tables. Notes are private: only readable/editable by the user who wrote them
-- (enforced in the app layer, since this project uses the anon key directly
-- rather than Supabase Auth — same pattern as the other item_* tables).
create table if not exists public.item_notes (
  id uuid primary key default gen_random_uuid(),
  item_type text not null default 'course' check (item_type in ('course', 'video')),
  item_id text not null,
  user_id text not null,
  note_text text not null,
  time_seconds int,
  created_at timestamptz not null default now()
);

create index if not exists item_notes_item_user_idx on public.item_notes (item_type, item_id, user_id);

alter table public.item_notes enable row level security;

drop policy if exists "notes_read" on public.item_notes;
drop policy if exists "notes_insert" on public.item_notes;
drop policy if exists "notes_update" on public.item_notes;
drop policy if exists "notes_delete" on public.item_notes;
create policy "notes_read"   on public.item_notes for select using (true);
create policy "notes_insert" on public.item_notes for insert with check (true);
create policy "notes_update" on public.item_notes for update using (true) with check (true);
create policy "notes_delete" on public.item_notes for delete using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.item_notes to anon, authenticated;

-- 2) career_applications -------------------------------------------------------
-- Submissions from the public "Apply Now" job / internship form (top-right of
-- the navbar, next to Login). Mirrors the guidance_requests table style.
create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  application_type text not null default 'Internship' check (application_type in ('Job', 'Internship')),
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  role text not null default '',
  department text not null default '',
  college_or_organization text not null default '',
  experience_level text not null default '',
  portfolio_url text not null default '',
  resume_url text not null default '',
  cover_message text not null default '',
  status text not null default 'New' check (status in ('New', 'In Review', 'Shortlisted', 'Rejected', 'Hired')),
  created_at timestamptz not null default now()
);

create index if not exists career_applications_status_idx on public.career_applications (status);
create index if not exists career_applications_type_idx on public.career_applications (application_type);

alter table public.career_applications enable row level security;

drop policy if exists "career_applications_read" on public.career_applications;
drop policy if exists "career_applications_insert" on public.career_applications;
drop policy if exists "career_applications_update" on public.career_applications;
drop policy if exists "career_applications_delete" on public.career_applications;
create policy "career_applications_read"   on public.career_applications for select using (true);
create policy "career_applications_insert" on public.career_applications for insert with check (true);
create policy "career_applications_update" on public.career_applications for update using (true) with check (true);
create policy "career_applications_delete" on public.career_applications for delete using (true);

grant select, insert, update, delete on public.career_applications to anon, authenticated;

-- 3) Storage bucket for resumes (bucket: resumes) -----------------------------
-- Same pattern as the existing mentor-photos bucket — public bucket, anon can
-- upload, since this project uses the anon key directly rather than Supabase Auth.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

drop policy if exists "resumes_read" on storage.objects;
drop policy if exists "resumes_write" on storage.objects;
drop policy if exists "resumes_update" on storage.objects;
drop policy if exists "resumes_delete" on storage.objects;
create policy "resumes_read"   on storage.objects for select using (bucket_id = 'resumes');
create policy "resumes_write"  on storage.objects for insert with check (bucket_id = 'resumes');
create policy "resumes_update" on storage.objects for update using (bucket_id = 'resumes');
create policy "resumes_delete" on storage.objects for delete using (bucket_id = 'resumes');
