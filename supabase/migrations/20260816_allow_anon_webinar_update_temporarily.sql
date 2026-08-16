-- Temporary unauthenticated webinar management support.
-- Keeps INSERT/UPDATE available to the existing local Skills021 admin flow
-- without changing the site's authentication system.
-- IMPORTANT: do not grant DELETE here.

GRANT USAGE ON SCHEMA public TO anon;
GRANT UPDATE ON TABLE public.live_webinars TO anon;

DROP POLICY IF EXISTS "Anyone can update live webinars temporarily"
ON public.live_webinars;

CREATE POLICY "Anyone can update live webinars temporarily"
ON public.live_webinars
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
