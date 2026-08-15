# Fix: `public.live_webinars` not found

If the site says:

`Failed to load live webinars: Could not find the table 'public.live_webinars' in the schema cache`

the Supabase project has not applied the webinar table migration (or PostgREST has not refreshed its schema).

## Do this once

1. Open the Supabase project used by this website.
2. Go to **SQL Editor**.
3. Open `supabase/migrations/20260815_ensure_live_webinars.sql`.
4. Run the entire SQL file.
5. Refresh the website.

The SQL creates `public.live_webinars` if it is missing, enables the required policies, allows an optional end time, and asks PostgREST to reload its schema cache.

## Important

A ZIP file cannot modify your hosted Supabase database by itself. The SQL must be run against the same Supabase project whose URL/key are in the website's environment configuration.

After it is run, the browser should be able to call:

`supabase.from('live_webinars').select('*')`

without the schema-cache error.
