# Skills021 — Original Login + Webinar Only

This package preserves the existing Skills021 local authentication flow.
No Supabase Auth integration has been added to login or webinar creation.

Webinar functionality included:
- live_webinars scheduling
- optional end time
- webinar recordings
- webinar UI/service

Important:
- Do NOT delete existing Supabase tables.
- Run `supabase/migrations/20260815_ensure_live_webinars.sql` for the live webinar table if it has not already been applied.
- Run `supabase/migrations/20260811_webinar_recordings.sql` for webinar recordings if needed.
- The duplicate older `20260815_live_webinars.sql` migration was intentionally excluded because it makes end time required and can conflict with the optional-end-time schema.
