-- ============================================================================
-- Skills021 — Webinar recordings migration
-- Run this ONCE in Supabase → SQL Editor. Safe to run more than once.
--
-- Gives the "Live webinar" card on the Home page a real place to keep past
-- session recordings, the same way course videos already work:
--   • A dedicated `webinar-videos` storage bucket (separate from
--     `course-videos` so paid course content and free webinar replays never
--     mix in the same folder).
--   • A `webinar_recordings` table so each recording has a title, the date
--     it aired, and its saved video URL — shown under "Past Sessions".
-- ============================================================================

-- 1) webinar_recordings ---------------------------------------------------------
create table if not exists public.webinar_recordings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  session_date date not null default current_date,
  video_url text,
  thumbnail_url text,
  duration text not null default '',
  status text not null default 'Published' check (status in ('Published', 'Draft')),
  created_at timestamptz not null default now()
);

create index if not exists webinar_recordings_date_idx on public.webinar_recordings (session_date desc);

-- 2) Storage bucket for the actual video files -----------------------------------
insert into storage.buckets (id, name, public)
values ('webinar-videos', 'webinar-videos', true)
on conflict (id) do update set public = true;

drop policy if exists "webinar_videos_read"   on storage.objects;
drop policy if exists "webinar_videos_write"  on storage.objects;
drop policy if exists "webinar_videos_update" on storage.objects;
drop policy if exists "webinar_videos_delete" on storage.objects;
create policy "webinar_videos_read"   on storage.objects for select using (bucket_id = 'webinar-videos');
create policy "webinar_videos_write"  on storage.objects for insert with check (bucket_id = 'webinar-videos');
create policy "webinar_videos_update" on storage.objects for update using (bucket_id = 'webinar-videos');
create policy "webinar_videos_delete" on storage.objects for delete using (bucket_id = 'webinar-videos');

-- 3) RLS ---------------------------------------------------------------------
alter table public.webinar_recordings enable row level security;

drop policy if exists "webinar_recordings_read"   on public.webinar_recordings;
drop policy if exists "webinar_recordings_insert" on public.webinar_recordings;
drop policy if exists "webinar_recordings_update" on public.webinar_recordings;
drop policy if exists "webinar_recordings_delete" on public.webinar_recordings;
create policy "webinar_recordings_read"   on public.webinar_recordings for select using (true);
create policy "webinar_recordings_insert" on public.webinar_recordings for insert with check (true);
create policy "webinar_recordings_update" on public.webinar_recordings for update using (true) with check (true);
create policy "webinar_recordings_delete" on public.webinar_recordings for delete using (true);

-- 4) Grants ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.webinar_recordings to anon, authenticated;
