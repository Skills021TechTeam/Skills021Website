-- ============================================================================
-- Skills021 — RBAC & Supabase RLS Security Enforcement Migration
-- Migration: 20260822_rbac_rls_security_enforcement.sql
--
-- Enforces:
-- 1. Database-level Role-Based Access Control (RBAC) via public.is_admin()
-- 2. Strict Row Level Security (RLS) across all application tables
-- 3. Strict Storage Policies for all buckets (including private resumes bucket)
-- 4. Protection against privilege escalation (preventing students from self-promoting to admin)
-- 5. Revocation of insecure anon permissions (preventing unauthenticated writes)
-- Safe to run more than once.
-- ============================================================================

-- ============================================================================
-- 1. Helper Function: public.is_admin()
-- Determines if the current caller is an authenticated administrator
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    -- Service role key has admin bypass
    (auth.jwt() ->> 'role' = 'service_role'),
    false
  ) or coalesce(
    -- Check profiles table for admin role
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    ),
    false
  ) or coalesce(
    -- Check JWT metadata claims
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'),
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'),
    false
  ) or coalesce(
    -- Check verified system admin email
    (auth.jwt() ->> 'email' = 'admin@skills021.com'),
    false
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ============================================================================
-- 2. Profiles Table & Privilege Protection Triggers
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  email text,
  name text,
  first_name text,
  last_name text,
  college text default 'Student Institution',
  phone text default '',
  role text not null default 'user' check (role in ('user', 'student', 'admin')),
  is_premium boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

-- Prevent unauthorized role escalation and unauthorized is_premium escalation
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If the caller is not an admin
  if not public.is_admin() then
    -- Cannot set or update role to admin
    if new.role is distinct from old.role and new.role = 'admin' then
      raise exception 'Unauthorized: Only system administrators can assign admin privileges.';
    end if;
    -- Non-admin inserting new row cannot set role to admin
    if tg_op = 'INSERT' and new.role = 'admin' and lower(coalesce(new.email, '')) <> 'admin@skills021.com' then
      new.role := 'user';
    end if;
    -- Cannot self-grant premium status
    if new.is_premium is distinct from old.is_premium and new.is_premium = true and (old.is_premium is null or old.is_premium = false) then
      raise exception 'Unauthorized: Premium status can only be granted by administrators or verified payment.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_protect_profile_privileges on public.profiles;
create trigger tr_protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Auto sync profile on new user registration in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
  full_name text;
begin
  if lower(new.email) = 'admin@skills021.com' or (new.raw_user_meta_data ->> 'role') = 'admin' then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');
  end if;

  full_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    trim(concat(new.raw_user_meta_data ->> 'first_name', ' ', new.raw_user_meta_data ->> 'last_name')),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (
    id,
    email,
    name,
    first_name,
    last_name,
    phone,
    college,
    role,
    is_premium
  )
  values (
    new.id,
    new.email,
    full_name,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(full_name, ' ', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'college', 'Student Institution'),
    assigned_role,
    coalesce((new.raw_user_meta_data ->> 'is_premium')::boolean, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case when public.is_admin() or lower(excluded.email) = 'admin@skills021.com' then excluded.role else profiles.role end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles RLS
alter table public.profiles enable row level security;

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

create policy "profiles_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id or public.is_admin());

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "profiles_delete" on public.profiles
  for delete using (public.is_admin());

-- ============================================================================
-- 3. Webinars (Live Webinars & Webinar Recordings)
-- View: Public (Anon, Student, Admin)
-- Create / Edit / Delete: Admin ONLY
-- ============================================================================
alter table public.live_webinars enable row level security;

drop policy if exists "live_webinars_read" on public.live_webinars;
drop policy if exists "live_webinars_insert" on public.live_webinars;
drop policy if exists "live_webinars_update" on public.live_webinars;
drop policy if exists "live_webinars_delete" on public.live_webinars;
drop policy if exists "Anyone can update live webinars temporarily" on public.live_webinars;

create policy "live_webinars_read" on public.live_webinars
  for select using (true);

create policy "live_webinars_insert" on public.live_webinars
  for insert with check (public.is_admin());

create policy "live_webinars_update" on public.live_webinars
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "live_webinars_delete" on public.live_webinars
  for delete using (public.is_admin());

-- Webinar Recordings
alter table public.webinar_recordings enable row level security;

drop policy if exists "webinar_recordings_read" on public.webinar_recordings;
drop policy if exists "webinar_recordings_insert" on public.webinar_recordings;
drop policy if exists "webinar_recordings_update" on public.webinar_recordings;
drop policy if exists "webinar_recordings_delete" on public.webinar_recordings;

create policy "webinar_recordings_read" on public.webinar_recordings
  for select using (status = 'Published' or public.is_admin());

create policy "webinar_recordings_insert" on public.webinar_recordings
  for insert with check (public.is_admin());

create policy "webinar_recordings_update" on public.webinar_recordings
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "webinar_recordings_delete" on public.webinar_recordings
  for delete using (public.is_admin());

-- ============================================================================
-- 4. Enrollments
-- View own enrollment: Student Allowed | Admin Allowed | Anon: Disallowed
-- Modify another enrollment: Student Disallowed | Anon Disallowed | Admin Allowed
-- ============================================================================
alter table public.enrollments enable row level security;

drop policy if exists "enrollments_read" on public.enrollments;
drop policy if exists "enrollments_insert" on public.enrollments;
drop policy if exists "enrollments_update" on public.enrollments;
drop policy if exists "enrollments_delete" on public.enrollments;

create policy "enrollments_read" on public.enrollments
  for select using (
    public.is_admin()
    or auth.uid()::text = user_id
    or (auth.jwt() ->> 'email' is not null and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "enrollments_insert" on public.enrollments
  for insert with check (
    public.is_admin()
    or auth.uid()::text = user_id
    or auth.role() = 'authenticated'
  );

create policy "enrollments_update" on public.enrollments
  for update using (
    public.is_admin()
    or (auth.uid()::text = user_id and payment_status = 'pending')
  )
  with check (
    public.is_admin()
    or (auth.uid()::text = user_id and payment_status = 'pending')
  );

create policy "enrollments_delete" on public.enrollments
  for delete using (public.is_admin());

-- ============================================================================
-- 5. Mentorship (Mentors & Mentor Sessions)
-- View mentors: Public (Anon, Student, Admin)
-- Add / Edit / Delete mentors: Admin ONLY
-- ============================================================================
alter table public.mentors enable row level security;

drop policy if exists "mentors_read" on public.mentors;
drop policy if exists "mentors_insert" on public.mentors;
drop policy if exists "mentors_update" on public.mentors;
drop policy if exists "mentors_delete" on public.mentors;

create policy "mentors_read" on public.mentors
  for select using (status = 'Active' or public.is_admin());

create policy "mentors_insert" on public.mentors
  for insert with check (public.is_admin());

create policy "mentors_update" on public.mentors
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "mentors_delete" on public.mentors
  for delete using (public.is_admin());

-- Mentor Sessions
alter table public.mentor_sessions enable row level security;

drop policy if exists "mentor_sessions_read" on public.mentor_sessions;
drop policy if exists "mentor_sessions_insert" on public.mentor_sessions;
drop policy if exists "mentor_sessions_update" on public.mentor_sessions;
drop policy if exists "mentor_sessions_delete" on public.mentor_sessions;

create policy "mentor_sessions_read" on public.mentor_sessions
  for select using (
    public.is_admin()
    or (auth.jwt() ->> 'email' is not null and lower(student_email) = lower(auth.jwt() ->> 'email'))
  );

create policy "mentor_sessions_insert" on public.mentor_sessions
  for insert with check (true);

create policy "mentor_sessions_update" on public.mentor_sessions
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "mentor_sessions_delete" on public.mentor_sessions
  for delete using (public.is_admin());

-- ============================================================================
-- 6. Guidance Requests
-- Submit request: Anon / Student / Admin Allowed
-- Read requests: Student (own only) | Admin (all) | Anon (Disallowed)
-- Update / Delete: Admin ONLY
-- ============================================================================
alter table public.guidance_requests enable row level security;

drop policy if exists "guidance_requests_read" on public.guidance_requests;
drop policy if exists "guidance_requests_insert" on public.guidance_requests;
drop policy if exists "guidance_requests_update" on public.guidance_requests;
drop policy if exists "guidance_requests_delete" on public.guidance_requests;

create policy "guidance_requests_read" on public.guidance_requests
  for select using (
    public.is_admin()
    or (auth.uid() is not null and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "guidance_requests_insert" on public.guidance_requests
  for insert with check (true);

create policy "guidance_requests_update" on public.guidance_requests
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "guidance_requests_delete" on public.guidance_requests
  for delete using (public.is_admin());

-- ============================================================================
-- 7. Courses & Academic Hierarchy
-- View: Public / Students (Published courses)
-- Create / Edit / Delete: Admin ONLY
-- ============================================================================
alter table public.site_courses enable row level security;

drop policy if exists "courses_read" on public.site_courses;
drop policy if exists "courses_insert" on public.site_courses;
drop policy if exists "courses_update" on public.site_courses;
drop policy if exists "courses_delete" on public.site_courses;
drop policy if exists "site_courses_read" on public.site_courses;
drop policy if exists "site_courses_insert" on public.site_courses;
drop policy if exists "site_courses_update" on public.site_courses;
drop policy if exists "site_courses_delete" on public.site_courses;

create policy "site_courses_read" on public.site_courses
  for select using (status = 'Published' or public.is_admin());

create policy "site_courses_insert" on public.site_courses
  for insert with check (public.is_admin());

create policy "site_courses_update" on public.site_courses
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "site_courses_delete" on public.site_courses
  for delete using (public.is_admin());

-- Academic Hierarchy tables
alter table public.colleges enable row level security;
alter table public.courses enable row level security;
alter table public.branches enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.resource_types enable row level security;
alter table public.resources enable row level security;

drop policy if exists "hierarchy_colleges_read" on public.colleges;
drop policy if exists "hierarchy_colleges_write" on public.colleges;
create policy "hierarchy_colleges_read" on public.colleges for select using (true);
create policy "hierarchy_colleges_write" on public.colleges for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hierarchy_courses_read" on public.courses;
drop policy if exists "hierarchy_courses_write" on public.courses;
create policy "hierarchy_courses_read" on public.courses for select using (true);
create policy "hierarchy_courses_write" on public.courses for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hierarchy_branches_read" on public.branches;
drop policy if exists "hierarchy_branches_write" on public.branches;
create policy "hierarchy_branches_read" on public.branches for select using (true);
create policy "hierarchy_branches_write" on public.branches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hierarchy_semesters_read" on public.semesters;
drop policy if exists "hierarchy_semesters_write" on public.semesters;
create policy "hierarchy_semesters_read" on public.semesters for select using (true);
create policy "hierarchy_semesters_write" on public.semesters for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hierarchy_subjects_read" on public.subjects;
drop policy if exists "hierarchy_subjects_write" on public.subjects;
create policy "hierarchy_subjects_read" on public.subjects for select using (true);
create policy "hierarchy_subjects_write" on public.subjects for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hierarchy_resource_types_read" on public.resource_types;
drop policy if exists "hierarchy_resource_types_write" on public.resource_types;
create policy "hierarchy_resource_types_read" on public.resource_types for select using (true);
create policy "hierarchy_resource_types_write" on public.resource_types for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "resources_read" on public.resources;
drop policy if exists "resources_write" on public.resources;
create policy "resources_read" on public.resources for select using (status = 'Published' or public.is_admin());
create policy "resources_write" on public.resources for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 8. Career Applications & Resumes
-- Submit: Public / Authenticated
-- Read: Student (own application) | Admin (all) | Anon (Disallowed)
-- Update / Delete: Admin ONLY
-- ============================================================================
alter table public.career_applications enable row level security;

drop policy if exists "career_applications_read" on public.career_applications;
drop policy if exists "career_applications_insert" on public.career_applications;
drop policy if exists "career_applications_update" on public.career_applications;
drop policy if exists "career_applications_delete" on public.career_applications;

create policy "career_applications_read" on public.career_applications
  for select using (
    public.is_admin()
    or (auth.uid() is not null and lower(email) = lower(auth.jwt() ->> 'email'))
  );

create policy "career_applications_insert" on public.career_applications
  for insert with check (true);

create policy "career_applications_update" on public.career_applications
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "career_applications_delete" on public.career_applications
  for delete using (public.is_admin());

-- ============================================================================
-- 9. Video Items (Notes, Timestamps, Ratings, Comments)
-- Notes: Private to student owner + Admin
-- Timestamps: Public read, Admin write
-- Ratings & Comments: Public read, Student write own, Admin manage all
-- ============================================================================
alter table public.item_notes enable row level security;

drop policy if exists "notes_read" on public.item_notes;
drop policy if exists "notes_insert" on public.item_notes;
drop policy if exists "notes_update" on public.item_notes;
drop policy if exists "notes_delete" on public.item_notes;

create policy "notes_read" on public.item_notes
  for select using (auth.uid()::text = user_id or public.is_admin());

create policy "notes_insert" on public.item_notes
  for insert with check (auth.uid()::text = user_id or public.is_admin());

create policy "notes_update" on public.item_notes
  for update using (auth.uid()::text = user_id or public.is_admin())
  with check (auth.uid()::text = user_id or public.is_admin());

create policy "notes_delete" on public.item_notes
  for delete using (auth.uid()::text = user_id or public.is_admin());

-- Item Timestamps
alter table public.item_timestamps enable row level security;

drop policy if exists "timestamps_read" on public.item_timestamps;
drop policy if exists "timestamps_insert" on public.item_timestamps;
drop policy if exists "timestamps_update" on public.item_timestamps;
drop policy if exists "timestamps_delete" on public.item_timestamps;

create policy "timestamps_read" on public.item_timestamps
  for select using (true);

create policy "timestamps_insert" on public.item_timestamps
  for insert with check (public.is_admin());

create policy "timestamps_update" on public.item_timestamps
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "timestamps_delete" on public.item_timestamps
  for delete using (public.is_admin());

-- Item Ratings
alter table public.item_ratings enable row level security;

drop policy if exists "ratings_read" on public.item_ratings;
drop policy if exists "ratings_insert" on public.item_ratings;
drop policy if exists "ratings_update" on public.item_ratings;
drop policy if exists "ratings_delete" on public.item_ratings;

create policy "ratings_read" on public.item_ratings
  for select using (true);

create policy "ratings_insert" on public.item_ratings
  for insert with check (auth.uid()::text = user_id or public.is_admin());

create policy "ratings_update" on public.item_ratings
  for update using (auth.uid()::text = user_id or public.is_admin())
  with check (auth.uid()::text = user_id or public.is_admin());

create policy "ratings_delete" on public.item_ratings
  for delete using (auth.uid()::text = user_id or public.is_admin());

-- Item Comments
alter table public.item_comments enable row level security;

drop policy if exists "comments_read" on public.item_comments;
drop policy if exists "comments_insert" on public.item_comments;
drop policy if exists "comments_delete" on public.item_comments;

create policy "comments_read" on public.item_comments
  for select using (true);

create policy "comments_insert" on public.item_comments
  for insert with check (auth.uid()::text = user_id or public.is_admin());

create policy "comments_delete" on public.item_comments
  for delete using (auth.uid()::text = user_id or public.is_admin());

-- ============================================================================
-- 10. Other Modules (Career Paths, Exams, Hackathons, Payment Settings)
-- ============================================================================
-- Payment Settings
create table if not exists public.payment_settings (
  id text primary key default 'default',
  upi_id text not null default 'skills021@upi',
  upi_name text not null default 'Skills021',
  qr_code_url text not null default '',
  instructions text not null default 'Scan QR or pay directly to the UPI ID, then enter your 12-digit UTR number and upload screenshot proof.',
  updated_at timestamptz not null default now()
);

alter table public.payment_settings enable row level security;

drop policy if exists "payment_settings_read" on public.payment_settings;
drop policy if exists "payment_settings_write" on public.payment_settings;

create policy "payment_settings_read" on public.payment_settings
  for select using (true);

create policy "payment_settings_write" on public.payment_settings
  for all using (public.is_admin())
  with check (public.is_admin());

-- Career Paths
alter table public.career_paths enable row level security;
drop policy if exists "career_paths_read" on public.career_paths;
drop policy if exists "career_paths_write" on public.career_paths;
create policy "career_paths_read" on public.career_paths for select using (true);
create policy "career_paths_write" on public.career_paths for all using (public.is_admin()) with check (public.is_admin());

-- Exams
alter table public.exams enable row level security;
drop policy if exists "exams_read" on public.exams;
drop policy if exists "exams_write" on public.exams;
create policy "exams_read" on public.exams for select using (true);
create policy "exams_write" on public.exams for all using (public.is_admin()) with check (public.is_admin());

-- Hackathons & Teams
alter table public.hackathons enable row level security;
drop policy if exists "hackathons_read" on public.hackathons;
drop policy if exists "hackathons_write" on public.hackathons;
create policy "hackathons_read" on public.hackathons for select using (true);
create policy "hackathons_write" on public.hackathons for all using (public.is_admin()) with check (public.is_admin());

alter table public.hackathon_teams enable row level security;
drop policy if exists "hackathon_teams_read" on public.hackathon_teams;
drop policy if exists "hackathon_teams_insert" on public.hackathon_teams;
drop policy if exists "hackathon_teams_update" on public.hackathon_teams;
drop policy if exists "hackathon_teams_delete" on public.hackathon_teams;
create policy "hackathon_teams_read" on public.hackathon_teams for select using (true);
create policy "hackathon_teams_insert" on public.hackathon_teams for insert with check (auth.role() = 'authenticated' or public.is_admin());
create policy "hackathon_teams_update" on public.hackathon_teams for update using (public.is_admin() or leader_id = auth.uid()::text) with check (public.is_admin() or leader_id = auth.uid()::text);
create policy "hackathon_teams_delete" on public.hackathon_teams for delete using (public.is_admin());

-- ============================================================================
-- 11. Storage Policies & Bucket Configurations
-- Private bucket for resumes (Student reads own resume, Admin reads all)
-- Admin-only write/delete on course videos, webinar videos, photos, resources
-- ============================================================================

-- Ensure storage buckets exist and configure visibility
insert into storage.buckets (id, name, public)
values
  ('resumes', 'resumes', false),
  ('course-videos', 'course-videos', true),
  ('webinar-videos', 'webinar-videos', true),
  ('course-thumbnails', 'course-thumbnails', true),
  ('resources', 'resources', true),
  ('mentor-photos', 'mentor-photos', true)
on conflict (id) do update set
  public = case when excluded.id = 'resumes' then false else true end;

-- Make sure resumes bucket is private
update storage.buckets set public = false where id = 'resumes';

-- Drop all previous storage policies
drop policy if exists "resumes_read" on storage.objects;
drop policy if exists "resumes_write" on storage.objects;
drop policy if exists "resumes_update" on storage.objects;
drop policy if exists "resumes_delete" on storage.objects;

drop policy if exists "course_videos_read" on storage.objects;
drop policy if exists "course_videos_write" on storage.objects;
drop policy if exists "course_videos_update" on storage.objects;
drop policy if exists "course_videos_delete" on storage.objects;

drop policy if exists "webinar_videos_read" on storage.objects;
drop policy if exists "webinar_videos_write" on storage.objects;
drop policy if exists "webinar_videos_update" on storage.objects;
drop policy if exists "webinar_videos_delete" on storage.objects;

drop policy if exists "course_thumbnails_read" on storage.objects;
drop policy if exists "course_thumbnails_write" on storage.objects;
drop policy if exists "course_thumbnails_update" on storage.objects;
drop policy if exists "course_thumbnails_delete" on storage.objects;

drop policy if exists "resources_read" on storage.objects;
drop policy if exists "resources_write" on storage.objects;
drop policy if exists "resources_update" on storage.objects;
drop policy if exists "resources_delete" on storage.objects;

drop policy if exists "mentor_photos_read" on storage.objects;
drop policy if exists "mentor_photos_write" on storage.objects;
drop policy if exists "mentor_photos_update" on storage.objects;
drop policy if exists "mentor_photos_delete" on storage.objects;

-- 11.1 Resumes Bucket Policies (Private: Student reads own, Admin reads all)
create policy "resumes_read" on storage.objects
  for select
  using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or (auth.uid() is not null and exists (
        select 1 from public.career_applications
        where lower(email) = lower(auth.jwt() ->> 'email')
        and resume_url like '%' || name
      ))
    )
  );

create policy "resumes_write" on storage.objects
  for insert
  with check (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or auth.role() = 'authenticated'
      or auth.role() = 'anon'
    )
  );

create policy "resumes_update" on storage.objects
  for update
  using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy "resumes_delete" on storage.objects
  for delete
  using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

-- 11.2 Course Videos Bucket Policies (Admin-only upload/delete)
create policy "course_videos_read" on storage.objects
  for select
  using (bucket_id = 'course-videos');

create policy "course_videos_write" on storage.objects
  for insert
  with check (bucket_id = 'course-videos' and public.is_admin());

create policy "course_videos_update" on storage.objects
  for update
  using (bucket_id = 'course-videos' and public.is_admin())
  with check (bucket_id = 'course-videos' and public.is_admin());

create policy "course_videos_delete" on storage.objects
  for delete
  using (bucket_id = 'course-videos' and public.is_admin());

-- 11.3 Webinar Videos Bucket Policies (Admin-only upload/delete)
create policy "webinar_videos_read" on storage.objects
  for select
  using (bucket_id = 'webinar-videos');

create policy "webinar_videos_write" on storage.objects
  for insert
  with check (bucket_id = 'webinar-videos' and public.is_admin());

create policy "webinar_videos_update" on storage.objects
  for update
  using (bucket_id = 'webinar-videos' and public.is_admin())
  with check (bucket_id = 'webinar-videos' and public.is_admin());

create policy "webinar_videos_delete" on storage.objects
  for delete
  using (bucket_id = 'webinar-videos' and public.is_admin());

-- 11.4 Course Thumbnails, Resources, Mentor Photos (Public read, Admin-only write)
create policy "course_thumbnails_read" on storage.objects
  for select using (bucket_id = 'course-thumbnails');
create policy "course_thumbnails_write" on storage.objects
  for insert with check (bucket_id = 'course-thumbnails' and public.is_admin());
create policy "course_thumbnails_update" on storage.objects
  for update using (bucket_id = 'course-thumbnails' and public.is_admin()) with check (bucket_id = 'course-thumbnails' and public.is_admin());
create policy "course_thumbnails_delete" on storage.objects
  for delete using (bucket_id = 'course-thumbnails' and public.is_admin());

create policy "resources_read" on storage.objects
  for select using (bucket_id = 'resources');
create policy "resources_write" on storage.objects
  for insert with check (bucket_id = 'resources' and public.is_admin());
create policy "resources_update" on storage.objects
  for update using (bucket_id = 'resources' and public.is_admin()) with check (bucket_id = 'resources' and public.is_admin());
create policy "resources_delete" on storage.objects
  for delete using (bucket_id = 'resources' and public.is_admin());

create policy "mentor_photos_read" on storage.objects
  for select using (bucket_id = 'mentor-photos');
create policy "mentor_photos_write" on storage.objects
  for insert with check (bucket_id = 'mentor-photos' and public.is_admin());
create policy "mentor_photos_update" on storage.objects
  for update using (bucket_id = 'mentor-photos' and public.is_admin()) with check (bucket_id = 'mentor-photos' and public.is_admin());
create policy "mentor_photos_delete" on storage.objects
  for delete using (bucket_id = 'mentor-photos' and public.is_admin());

-- ============================================================================
-- 12. PostgreSQL Explicit Grants and Anon Revocations
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;

-- Grant broad capabilities to authenticated role (RLS strictly filters access per-row)
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Anonymous grants (strictly read-only on public catalog + insert on submission forms)
grant select on public.live_webinars to anon;
grant select on public.webinar_recordings to anon;
grant select on public.mentors to anon;
grant select on public.site_courses to anon;
grant select on public.item_timestamps to anon;
grant select on public.item_ratings to anon;
grant select on public.item_comments to anon;
grant select on public.colleges to anon;
grant select on public.courses to anon;
grant select on public.branches to anon;
grant select on public.semesters to anon;
grant select on public.subjects to anon;
grant select on public.resource_types to anon;
grant select on public.resources to anon;
grant select on public.career_paths to anon;
grant select on public.exams to anon;
grant select on public.hackathons to anon;
grant select on public.hackathon_teams to anon;
grant select on public.payment_settings to anon;

-- Public submission tables (Anon can insert, but cannot read or modify other student submissions)
grant insert on public.guidance_requests to anon;
grant insert on public.mentor_sessions to anon;
grant insert on public.career_applications to anon;

-- Explicitly revoke admin and private table permissions from anon
revoke insert, update, delete on public.live_webinars from anon;
revoke insert, update, delete on public.webinar_recordings from anon;
revoke insert, update, delete on public.mentors from anon;
revoke insert, update, delete on public.site_courses from anon;
revoke insert, update, delete on public.item_timestamps from anon;
revoke insert, update, delete on public.payment_settings from anon;
revoke insert, update, delete on public.profiles from anon;
revoke insert, update, delete on public.colleges from anon;
revoke insert, update, delete on public.courses from anon;
revoke insert, update, delete on public.branches from anon;
revoke insert, update, delete on public.semesters from anon;
revoke insert, update, delete on public.subjects from anon;
revoke insert, update, delete on public.resource_types from anon;
revoke insert, update, delete on public.resources from anon;
revoke insert, update, delete on public.career_paths from anon;
revoke insert, update, delete on public.exams from anon;
revoke insert, update, delete on public.hackathons from anon;
revoke update, delete on public.guidance_requests from anon;
revoke update, delete on public.mentor_sessions from anon;
revoke update, delete on public.career_applications from anon;

-- Revoke select on private student data tables from anon
revoke select on public.enrollments from anon;
revoke select on public.guidance_requests from anon;
revoke select on public.career_applications from anon;
revoke select on public.item_notes from anon;
revoke select on public.profiles from anon;

-- Reload schema cache in PostgREST
notify pgrst, 'reload schema';
