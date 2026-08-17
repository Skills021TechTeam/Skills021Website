-- ============================================================================
-- Skills021 — Additive migration
-- Run this ONCE in Supabase → SQL Editor. Safe to run more than once.
--
-- Fixes: "Notes don't download from the Courses panel / Resources panel."
--
-- Root cause: the `resources`, `course-videos` and `course-thumbnails`
-- storage buckets were created directly in the Supabase dashboard rather
-- than through a tracked migration, so (unlike `resumes` and
-- `mentor-photos`, which do have migrations) they can end up missing an
-- explicit row-level-security SELECT policy on storage.objects. Uploads
-- still work because an insert policy exists, but a bare `download()` /
-- direct fetch of the file can be rejected — which is exactly what makes
-- the "Download" button in the course video player / Resources page look
-- like it does nothing.
--
-- This migration is purely additive: it creates the buckets if they don't
-- already exist (no-op if they do) and (re)creates the read/write policies
-- so every one of them behaves like the existing public buckets.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('resources', 'resources', true),
  ('course-videos', 'course-videos', true),
  ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do update set public = true;

-- resources bucket (Notes / PYQs / e-books / etc. uploaded via the Admin →
-- Resources panel, downloaded from the Resources page and from inside a
-- course's video player)
drop policy if exists "resources_read" on storage.objects;
drop policy if exists "resources_write" on storage.objects;
drop policy if exists "resources_update" on storage.objects;
drop policy if exists "resources_delete" on storage.objects;
create policy "resources_read"   on storage.objects for select using (bucket_id = 'resources');
create policy "resources_write"  on storage.objects for insert with check (bucket_id = 'resources');
create policy "resources_update" on storage.objects for update using (bucket_id = 'resources');
create policy "resources_delete" on storage.objects for delete using (bucket_id = 'resources');

-- course-videos bucket (course video files uploaded via Admin → Courses)
drop policy if exists "course_videos_read" on storage.objects;
drop policy if exists "course_videos_write" on storage.objects;
drop policy if exists "course_videos_update" on storage.objects;
drop policy if exists "course_videos_delete" on storage.objects;
create policy "course_videos_read"   on storage.objects for select using (bucket_id = 'course-videos');
create policy "course_videos_write"  on storage.objects for insert with check (bucket_id = 'course-videos');
create policy "course_videos_update" on storage.objects for update using (bucket_id = 'course-videos');
create policy "course_videos_delete" on storage.objects for delete using (bucket_id = 'course-videos');

-- course-thumbnails bucket (course thumbnail images uploaded via Admin → Courses)
drop policy if exists "course_thumbnails_read" on storage.objects;
drop policy if exists "course_thumbnails_write" on storage.objects;
drop policy if exists "course_thumbnails_update" on storage.objects;
drop policy if exists "course_thumbnails_delete" on storage.objects;
create policy "course_thumbnails_read"   on storage.objects for select using (bucket_id = 'course-thumbnails');
create policy "course_thumbnails_write"  on storage.objects for insert with check (bucket_id = 'course-thumbnails');
create policy "course_thumbnails_update" on storage.objects for update using (bucket_id = 'course-thumbnails');
create policy "course_thumbnails_delete" on storage.objects for delete using (bucket_id = 'course-thumbnails');
