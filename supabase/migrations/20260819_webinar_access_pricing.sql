-- Webinar access controls: free, paid, or free for any enrolled student.
alter table public.live_webinars
  add column if not exists access_type text not null default 'free',
  add column if not exists price numeric(10,2) not null default 0;

alter table public.webinar_recordings
  add column if not exists access_type text not null default 'free',
  add column if not exists price numeric(10,2) not null default 0;

alter table public.live_webinars
  drop constraint if exists live_webinars_access_type_check;
alter table public.live_webinars
  add constraint live_webinars_access_type_check
  check (access_type in ('free','paid','enrolled_free'));

alter table public.webinar_recordings
  drop constraint if exists webinar_recordings_access_type_check;
alter table public.webinar_recordings
  add constraint webinar_recordings_access_type_check
  check (access_type in ('free','paid','enrolled_free'));

alter table public.live_webinars
  drop constraint if exists live_webinars_price_check;
alter table public.live_webinars
  add constraint live_webinars_price_check check (price >= 0);

alter table public.webinar_recordings
  drop constraint if exists webinar_recordings_price_check;
alter table public.webinar_recordings
  add constraint webinar_recordings_price_check check (price >= 0);
