import { supabase } from './supabase'
import { getBackblazeVideoUrl, uploadToBackblaze, deleteBackblazeFile, isBackblazeRef } from './backblazeService'

export type WebinarAccess = 'free' | 'paid' | 'enrolled_free'

export interface WebinarRecording {
  id: string
  title: string
  description: string
  sessionDate: string
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: string
  status: 'Published' | 'Draft'
  access: WebinarAccess
  price: number
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
  access_type: WebinarAccess
  price: number
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
    access: row.access_type ?? 'free',
    price: Number(row.price ?? 0),
    createdAt: row.created_at,
  }
}

// ─── List past webinar recordings (newest first) ────────────────────────────
export async function getWebinarRecordings(resolveVideo = true): Promise<WebinarRecording[]> {
  const { data, error } = await supabase
    .from('webinar_recordings')
    .select('*')
    .order('session_date', { ascending: false })

  if (error) throw new Error(`Failed to load webinar recordings: ${error.message}`)
  const rows = (data as unknown as WebinarRecordingRow[]).map(mapRow)
  if (!resolveVideo) return rows
  return Promise.all(rows.map(async (item) => ({
    ...item,
    videoUrl: item.videoUrl && isBackblazeRef(item.videoUrl) ? await getBackblazeVideoUrl(item.videoUrl) : item.videoUrl,
  })))
}

// ─── Save a new webinar recording's metadata row ────────────────────────────
export async function createWebinarRecording(input: {
  title: string
  description?: string
  sessionDate: string
  videoUrl: string
  thumbnailUrl?: string
  duration?: string
  access?: WebinarAccess
  price?: number
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
      access_type: input.access ?? 'free',
      price: Math.max(0, Number(input.price ?? 0)),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save webinar recording: ${error.message}`)
  return mapRow(data as unknown as WebinarRecordingRow)
}

// ─── Storage: upload the actual video file to Backblaze B2 ─────────────────
// Saved at: webinars/<sessionDate>/<fileName>
export async function uploadWebinarVideo(file: File, sessionDate: string, onProgress?: (percent: number) => void): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '-')
  const path = `webinars/${sessionDate}/${Date.now()}-${safeName}`
  return uploadToBackblaze(file, path, onProgress)
}

// ─── Storage: delete a saved webinar video by its public URL ───────────────
export async function deleteWebinarVideo(fileUrl: string): Promise<void> {
  if (isBackblazeRef(fileUrl)) {
    await deleteBackblazeFile(fileUrl)
    return
  }

  const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (!storageMatch) return

  const [, bucket, path] = storageMatch

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error(`Failed to delete webinar video from Storage: ${error.message}`)
  }
}


export async function resolveWebinarRecordingVideo(recording: WebinarRecording): Promise<string | null> {
  if (!recording.videoUrl) return null
  if (isBackblazeRef(recording.videoUrl)) return getBackblazeVideoUrl(recording.videoUrl)
  return recording.videoUrl
}

export async function deleteWebinarRecording(recording: WebinarRecording): Promise<void> {
  // Fetch the canonical stored reference from the DB. getWebinarRecordings()
  // intentionally resolves b2:// refs into short-lived signed URLs for playback,
  // so the URL held by the UI is not suitable for deletion.
  const { data: row, error: fetchError } = await supabase
    .from('webinar_recordings')
    .select('video_url')
    .eq('id', recording.id)
    .single()

  if (fetchError) throw new Error(`Failed to locate webinar recording: ${fetchError.message}`)

  const storedUrl = row?.video_url as string | null
  if (storedUrl && isBackblazeRef(storedUrl)) {
    await deleteBackblazeFile(storedUrl)
  } else if (storedUrl) {
    const storageMatch = storedUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
    if (storageMatch) {
      const [, bucket, path] = storageMatch
      const { error } = await supabase.storage.from(bucket).remove([path])
      if (error) throw new Error(`Failed to delete stored webinar video: ${error.message}`)
    }
  }

  const { error } = await supabase.from('webinar_recordings').delete().eq('id', recording.id)
  if (error) throw new Error(`Failed to delete webinar recording: ${error.message}`)
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
  access: WebinarAccess
  price: number
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
  access_type: WebinarAccess
  price: number
  created_at: string
}

function mapLiveRow(row: LiveWebinarRow): LiveWebinar {
  return { id: row.id, title: row.title, description: row.description, provider: row.provider, joinUrl: row.join_url, startsAt: row.starts_at, endsAt: row.ends_at, access: row.access_type ?? 'free', price: Number(row.price ?? 0), createdAt: row.created_at }
}

export async function getLiveWebinars(): Promise<LiveWebinar[]> {
  const { data, error } = await supabase.from('live_webinars').select('*').order('starts_at', { ascending: true })
  if (error) throw new Error(`Failed to load live webinars: ${error.message}`)
  return (data as unknown as LiveWebinarRow[]).map(mapLiveRow)
}

export async function createLiveWebinar(input: Omit<LiveWebinar, 'id' | 'createdAt'>): Promise<LiveWebinar> {
  const { data, error } = await supabase.from('live_webinars').insert({
    title: input.title, description: input.description, provider: input.provider, join_url: input.joinUrl, starts_at: input.startsAt, ends_at: input.endsAt, access_type: input.access, price: Math.max(0, Number(input.price ?? 0))
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
    access_type: input.access,
    price: Math.max(0, Number(input.price ?? 0)),
  }).eq('id', id).select().single()

  if (error) throw new Error(`Failed to update live webinar: ${error.message}`)
  return mapLiveRow(data as unknown as LiveWebinarRow)
}

export async function deleteLiveWebinar(id: string): Promise<void> {
  const { error } = await supabase.from('live_webinars').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete live webinar: ${error.message}`)
}
