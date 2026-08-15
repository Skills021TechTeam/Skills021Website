# Fix for `permission denied for table live_webinars`

Your app uses a local Zustand/localStorage login, while Supabase RLS requires a real
Supabase Auth session for protected webinar INSERT/UPDATE/DELETE operations.

This patch makes the existing admin login also sign in to Supabase Auth.

## One-time setup

1. Open Supabase Dashboard.
2. Go to Authentication -> Users.
3. Create an admin user with the **same email and password** used by your Skills021
   local admin account.
4. Keep your existing RLS policies:
   - authenticated can INSERT/UPDATE/DELETE `live_webinars`
   - anon/authenticated can SELECT published webinars
5. Do NOT grant INSERT/UPDATE/DELETE on `live_webinars` to `anon`.

## Then

1. Run `npm install` if needed.
2. Run `npm run dev`.
3. Sign out of Skills021 if already logged in.
4. Sign in again using the admin email/password.
5. Schedule the webinar.

The login page will establish a Supabase Auth session for the admin before opening
the admin dashboard. The rest of the site's existing local authentication remains
unchanged.

## If you already created the Supabase Auth admin

Make sure the email/password exactly matches the credentials used by the Skills021
admin login. If the Supabase user has email confirmation enabled, confirm the user
before signing in.

## Security

Do not solve this by granting INSERT to `anon`. That would allow unauthenticated
visitors to write webinar rows.
