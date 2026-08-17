# Skills021 Webinar — Completed Work

## What is now complete

### Admin Webinar panel
- Schedule live webinars with Google Meet or Zoom.
- Start date/time uses the existing 12-hour AM/PM UI.
- End time is optional; leaving it off keeps the session open until manually deleted/ended.
- Edit upcoming webinars.
- Delete scheduled webinars.

### Webinar recordings
- Admin can select a local video file and publish it as a replay.
- Recording videos are uploaded to Backblaze B2 under:
  `webinars/<session-date>/<timestamp>-<safe-file-name>`
- Real upload progress is shown in the admin UI.
- If duration is left blank, the app attempts to read the video metadata and fills a human-readable duration automatically.
- Published replay list shows the stored replay and allows opening it.
- Admin can delete a replay; the Backblaze webinar file and database row are removed.

### Public Courses → Webinars section
- Shows the currently active live webinar when its start time has passed and its end time has not passed.
- Shows the next scheduled webinar when no webinar is currently live.
- Shows published webinar replays below the live/upcoming section.
- Backblaze `b2://...` references are converted to short-lived authorized playback URLs through the Supabase Edge Function.

### Backblaze improvements
- Browser uploads now use XMLHttpRequest so upload progress can be displayed.
- Added a `delete-file` Edge Function action for webinar recordings only.
- Delete is restricted to files inside the `webinars/` prefix so the webinar delete flow cannot remove course media.

## Important deployment step
After replacing the project files, deploy the updated Edge Function:

```powershell
supabase functions deploy backblaze-storage
```

Then run:

```powershell
npm run build
```

If the build succeeds, start the app with:

```powershell
npm run dev
```

## Backblaze CORS
For local development, the bucket should allow:

`http://localhost:5173`

When the site is deployed to a real domain, add that exact frontend origin to the Backblaze bucket CORS rules as well.

## Webinar access & pricing update

- Added `access_type` and `price` to live webinars and webinar recordings.
- Admin can choose: Free for everyone, Paid for everyone, or Free for enrolled students / paid for others.
- Upcoming webinar access can be changed from the existing Edit upcoming webinar modal.
- Recording upload form includes the same access and pricing controls.
- Public Courses > Webinars now shows access badges and gates live/replay access.
- Students with any non-pending course enrollment automatically receive `enrolled_free` webinars at no charge.
- Backblaze replay URLs are no longer resolved on the public listing; a signed playback URL is generated only when an allowed user opens the replay.
- Paid checkout is intentionally not claimed as implemented because this project currently has no real webinar payment gateway configured. The UI gates paid content and displays the configured price.

Run the new Supabase migration before using these fields:
`supabase/migrations/20260816_webinar_access_pricing.sql`
