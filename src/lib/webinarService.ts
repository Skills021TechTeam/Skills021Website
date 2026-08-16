import { supabase } from './supabase'

export interface WebinarRecording {
  id: string
  title: string
  description: string
  sessionDate: string
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: string
  status: 'Published' | 'Draft'
  createdAt: string
}

interface WebinarRecordingRow {
  id: string
  title: string
  description: string
  session_date: string
  video_url: string | null
  thumbnail_url: string | null
  duration: string
  status: 'Published' | 'Draft'
  created_at: string
}

function mapRow(row: WebinarRecordingRow): WebinarRecording {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sessionDate: row.session_date,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    duration: row.duration,
    status: row.status,
    createdAt: row.created_at,
  }
}

// ─── List past webinar recordings (newest first) ────────────────────────────
export async function getWebinarRecordings(): Promise<WebinarRecording[]> {
  const { data, error } = await supabase
    .from('webinar_recordings')
    .select('*')
    .order('session_date', { ascending: false })

  if (error) throw new Error(`Failed to load webinar recordings: ${error.message}`)
  return (data as unknown as WebinarRecordingRow[]).map(mapRow)
}

// ─── Save a new webinar recording's metadata row ────────────────────────────
export async function createWebinarRecording(input: {
  title: string
  description?: string
  sessionDate: string
  videoUrl: string
  thumbnailUrl?: string
  duration?: string
}): Promise<WebinarRecording> {
  const { data, error } = await supabase
    .from('webinar_recordings')
    .insert({
      title: input.title,
      description: input.description ?? '',
      session_date: input.sessionDate,
      video_url: input.videoUrl,
      thumbnail_url: input.thumbnailUrl ?? null,
      duration: input.duration ?? '',
      status: 'Published',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save webinar recording: ${error.message}`)
  return mapRow(data as unknown as WebinarRecordingRow)
}

// ─── Storage: upload the actual video file (bucket: webinar-videos) ────────
// Saved at: webinar-videos/<sessionDate>/<fileName>  e.g.
//   webinar-videos/2026-08-15/career-qa-live.mp4
export async function uploadWebinarVideo(file: File, sessionDate: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '-')
  const path = `${sessionDate}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from('webinar-videos')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) throw new Error(`Failed to upload webinar video: ${error.message}`)

  const { data } = supabase.storage.from('webinar-videos').getPublicUrl(path)
  return data.publicUrl
}

// ─── Storage: delete a saved webinar video by its public URL ───────────────
export async function deleteWebinarVideo(fileUrl: string): Promise<void> {
  const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (!storageMatch) return
  const [, bucket, path] = storageMatch

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.error(`Failed to delete webinar video from Storage: ${error.message}`)
}


export type WebinarProvider = 'Google Meet' | 'Zoom'

export interface LiveWebinar {
  id: string
  title: string
  description: string
  provider: WebinarProvider
  joinUrl: string
  startsAt: string
  endsAt: string | null
  createdAt: string
}

interface LiveWebinarRow {
  id: string
  title: string
  description: string
  provider: WebinarProvider
  join_url: string
  starts_at: string
  ends_at: string | null
  created_at: string
}

function mapLiveRow(row: LiveWebinarRow): LiveWebinar {
  return { id: row.id, title: row.title, description: row.description, provider: row.provider, joinUrl: row.join_url, startsAt: row.starts_at, endsAt: row.ends_at, createdAt: row.created_at }
}

export async function getLiveWebinars(): Promise<LiveWebinar[]> {
  const { data, error } = await supabase.from('live_webinars').select('*').order('starts_at', { ascending: true })
  if (error) throw new Error(`Failed to load live webinars: ${error.message}`)
  return (data as unknown as LiveWebinarRow[]).map(mapLiveRow)
}

export async function createLiveWebinar(input: Omit<LiveWebinar, 'id' | 'createdAt'>): Promise<LiveWebinar> {
  const { data, error } = await supabase.from('live_webinars').insert({
    title: input.title, description: input.description, provider: input.provider, join_url: input.joinUrl, starts_at: input.startsAt, ends_at: input.endsAt
  }).select().single()
  if (error) throw new Error(`Failed to create live webinar: ${error.message}`)
  return mapLiveRow(data as unknown as LiveWebinarRow)
}

export async function updateLiveWebinar(id: string, input: Omit<LiveWebinar, 'id' | 'createdAt'>): Promise<LiveWebinar> {
  const { data, error } = await supabase.from('live_webinars').update({
    title: input.title,
    description: input.description,
    provider: input.provider,
    join_url: input.joinUrl,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  }).eq('id', id).select().single()

  if (error) throw new Error(`Failed to update live webinar: ${error.message}`)
  return mapLiveRow(data as unknown as LiveWebinarRow)
}

export async function deleteLiveWebinar(id: string): Promise<void> {
  const { error } = await supabase.from('live_webinars').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete live webinar: ${error.message}`)
}
