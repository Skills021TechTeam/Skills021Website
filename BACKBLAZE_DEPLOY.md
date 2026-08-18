# Backblaze B2 video storage handoff

## Already configured in Supabase Edge Function Secrets
- BACKBLAZE_ENDPOINT
- BACKBLAZE_REGION
- BACKBLAZE_BUCKET
- BACKBLAZE_KEY_ID
- BACKBLAZE_APPLICATION_KEY

## Deploy
From this `webinar` project folder:

```bash
supabase functions deploy backblaze-storage
```

The function is at `supabase/functions/backblaze-storage/index.ts`.

## What the code does
- Course video uploads go to Backblaze B2.
- Webinar recording uploads go to Backblaze B2.
- Supabase continues to store the course/webinar metadata and a `b2://...` object reference in the existing `video_url` columns.
- Playback gets a temporary download URL from the Edge Function only when the video is opened.
- Resumes, mentor photos, course thumbnails and other existing Supabase Storage assets are unchanged.
- Existing Supabase video objects are not automatically deleted.

## Important B2 CORS
For local development, allow:
`http://localhost:5173`

When the website is deployed, add its exact HTTPS origin to the B2 bucket CORS rules as well.

## Local browser upload CORS
If the browser shows `Network error while uploading to Backblaze`, apply the included `cors-rules.json` to the B2 bucket. The upload rule must allow `b2_upload_file` and the exact browser origin; Backblaze evaluates CORS rules against the browser preflight request.

PowerShell:

```powershell
$corsRules = Get-Content .\cors-rules.json -Raw
b2 bucket update --cors-rules $corsRules skills021-media allPrivate
b2 bucket get skills021-media
```

The included local rules cover both `http://localhost:5173` and `http://127.0.0.1:5173`.
