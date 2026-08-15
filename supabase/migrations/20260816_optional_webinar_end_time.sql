-- Make webinar end time optional. If omitted, the webinar stays live until an admin ends it manually.
alter table public.live_webinars
  alter column ends_at drop not null;

alter table public.live_webinars
  drop constraint if exists live_webinars_time_check;

alter table public.live_webinars
  add constraint live_webinars_time_check
  check (ends_at is null or ends_at > starts_at);
