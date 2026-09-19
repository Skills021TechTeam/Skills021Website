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
    .select('id, title, description, session_date, video_url, thumbnail_url, duration, status, access_type, price, created_at')
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

export interface SpeakerHighlight {
  title: string
  subtitle: string
}

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
  // Speaker & Registration details stored directly in live_webinars table
  speakerName?: string
  speakerBadge?: string
  speakerPhotoUrl?: string
  speakerBio?: string[]
  tags?: string[]
  highlights?: SpeakerHighlight[]
  isFeatured?: boolean
  registrationStartsAt?: string | null
  registrationEndsAt?: string | null
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

export function encodeWebinarDescription(description: string, extra?: {
  speakerName?: string
  speakerBadge?: string
  speakerPhotoUrl?: string
  speakerBio?: string[]
  tags?: string[]
  highlights?: SpeakerHighlight[]
  isFeatured?: boolean
  registrationStartsAt?: string | null
  registrationEndsAt?: string | null
}): string {
  const clean = (description || '').replace(/<!--SPEAKER:[\s\S]*?-->/g, '').trim()
  if (!extra || Object.values(extra).every(v => v === undefined || v === '' || (Array.isArray(v) && v.length === 0))) {
    return clean
  }
  return `${clean}\n<!--SPEAKER:${JSON.stringify(extra)}-->`
}

export function parseWebinarDescription(rawDescription: string): {
  cleanDescription: string
  speakerMeta: {
    speakerName?: string
    speakerBadge?: string
    speakerPhotoUrl?: string
    speakerBio?: string[]
    tags?: string[]
    highlights?: SpeakerHighlight[]
    isFeatured?: boolean
    registrationStartsAt?: string | null
    registrationEndsAt?: string | null
  }
} {
  const clean = (rawDescription || '').replace(/<!--SPEAKER:[\s\S]*?-->/g, '').trim()
  const match = (rawDescription || '').match(/<!--SPEAKER:([\s\S]*?)-->/)
  let speakerMeta: any = {}
  if (match) {
    try {
      speakerMeta = JSON.parse(match[1])
    } catch {}
  }
  return { cleanDescription: clean, speakerMeta }
}

function mapLiveRow(row: LiveWebinarRow): LiveWebinar {
  const { cleanDescription, speakerMeta } = parseWebinarDescription(row.description || '')
  return {
    id: row.id,
    title: row.title,
    description: cleanDescription,
    provider: row.provider,
    joinUrl: row.join_url,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    access: row.access_type ?? 'free',
    price: Number(row.price ?? 0),
    createdAt: row.created_at,
    speakerName: speakerMeta.speakerName || '',
    speakerBadge: speakerMeta.speakerBadge || '',
    speakerPhotoUrl: speakerMeta.speakerPhotoUrl || '',
    speakerBio: Array.isArray(speakerMeta.speakerBio) ? speakerMeta.speakerBio : [],
    tags: Array.isArray(speakerMeta.tags) ? speakerMeta.tags : [],
    highlights: Array.isArray(speakerMeta.highlights) ? speakerMeta.highlights : [],
    isFeatured: Boolean(speakerMeta.isFeatured),
    registrationStartsAt: speakerMeta.registrationStartsAt || null,
    registrationEndsAt: speakerMeta.registrationEndsAt || null,
  }
}

export async function getLiveWebinars(): Promise<LiveWebinar[]> {
  const { data, error } = await supabase
    .from('live_webinars')
    .select('id, title, description, provider, join_url, starts_at, ends_at, access_type, price, created_at')
    .order('starts_at', { ascending: true })

  if (error) throw new Error(`Failed to load live webinars: ${error.message}`)
  return (data as unknown as LiveWebinarRow[]).map(mapLiveRow)
}

export interface CreateLiveWebinarInput {
  title: string
  description: string
  provider: WebinarProvider
  joinUrl: string
  startsAt: string
  endsAt?: string | null
  access: WebinarAccess
  price?: number
  speakerName?: string
  speakerBadge?: string
  speakerPhotoUrl?: string
  speakerBio?: string[]
  tags?: string[]
  highlights?: SpeakerHighlight[]
  isFeatured?: boolean
  registrationStartsAt?: string | null
  registrationEndsAt?: string | null
}

export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Starting now'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

export interface WebinarTimingState {
  webinarStartMs: number
  webinarEndMs: number
  regStartMs: number
  regEndMs: number
  isWebinarUpcoming: boolean
  isWebinarLive: boolean
  isWebinarEnded: boolean
  isRegUpcoming: boolean
  isRegOpen: boolean
  isRegClosed: boolean
  remainingTimeWebinarMs: number
  remainingTimeWebinarStr: string
  remainingTimeRegMs: number
  remainingTimeRegStr: string
}

export function getWebinarTimingState(webinar: LiveWebinar, nowMs = Date.now()): WebinarTimingState {
  const webinarStartMs = new Date(webinar.startsAt).getTime()
  // Default session duration is 2 hours if no endsAt provided
  const webinarEndMs = webinar.endsAt
    ? new Date(webinar.endsAt).getTime()
    : webinarStartMs + 2 * 60 * 60 * 1000

  // Registration start defaults to created_at or beginning of time if not specified
  const regStartMs = webinar.registrationStartsAt
    ? new Date(webinar.registrationStartsAt).getTime()
    : (webinar.createdAt ? new Date(webinar.createdAt).getTime() : 0)

  // Registration end defaults to webinarEndMs (or webinarStartMs) if not specified
  const regEndMs = webinar.registrationEndsAt
    ? new Date(webinar.registrationEndsAt).getTime()
    : webinarEndMs

  const isWebinarLive = nowMs >= webinarStartMs && nowMs < webinarEndMs
  const isWebinarEnded = nowMs >= webinarEndMs
  const isWebinarUpcoming = nowMs < webinarStartMs

  const isRegUpcoming = nowMs < regStartMs
  const isRegOpen = nowMs >= regStartMs && nowMs < regEndMs && !isWebinarEnded
  const isRegClosed = nowMs >= regEndMs || isWebinarEnded

  const remainingTimeWebinarMs = Math.max(0, webinarStartMs - nowMs)
  const remainingTimeRegMs = Math.max(0, regEndMs - nowMs)

  return {
    webinarStartMs,
    webinarEndMs,
    regStartMs,
    regEndMs,
    isWebinarUpcoming,
    isWebinarLive,
    isWebinarEnded,
    isRegUpcoming,
    isRegOpen,
    isRegClosed,
    remainingTimeWebinarMs,
    remainingTimeWebinarStr: formatRemainingTime(remainingTimeWebinarMs),
    remainingTimeRegMs,
    remainingTimeRegStr: formatRemainingTime(remainingTimeRegMs),
  }
}

export async function createLiveWebinar(input: CreateLiveWebinarInput): Promise<LiveWebinar> {
  const fullDescription = encodeWebinarDescription(input.description, {
    speakerName: input.speakerName,
    speakerBadge: input.speakerBadge,
    speakerPhotoUrl: input.speakerPhotoUrl,
    speakerBio: input.speakerBio,
    tags: input.tags,
    highlights: input.highlights,
    isFeatured: input.isFeatured,
    registrationStartsAt: input.registrationStartsAt,
    registrationEndsAt: input.registrationEndsAt,
  })

  const { data, error } = await supabase
    .from('live_webinars')
    .insert({
      title: input.title,
      description: fullDescription,
      provider: input.provider,
      join_url: input.joinUrl,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      access_type: input.access,
      price: Math.max(0, Number(input.price ?? 0)),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create live webinar: ${error.message}`)
  return mapLiveRow(data as unknown as LiveWebinarRow)
}

export async function updateLiveWebinar(id: string, input: Partial<CreateLiveWebinarInput>): Promise<LiveWebinar> {
  // Fetch existing row to preserve description if needed
  const { data: existing, error: fetchErr } = await supabase
    .from('live_webinars')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr) throw new Error(`Webinar not found: ${fetchErr.message}`)
  const existingMapped = mapLiveRow(existing as unknown as LiveWebinarRow)

  const mergedDesc = input.description !== undefined ? input.description : existingMapped.description
  const fullDescription = encodeWebinarDescription(mergedDesc, {
    speakerName: input.speakerName !== undefined ? input.speakerName : existingMapped.speakerName,
    speakerBadge: input.speakerBadge !== undefined ? input.speakerBadge : existingMapped.speakerBadge,
    speakerPhotoUrl: input.speakerPhotoUrl !== undefined ? input.speakerPhotoUrl : existingMapped.speakerPhotoUrl,
    speakerBio: input.speakerBio !== undefined ? input.speakerBio : existingMapped.speakerBio,
    tags: input.tags !== undefined ? input.tags : existingMapped.tags,
    highlights: input.highlights !== undefined ? input.highlights : existingMapped.highlights,
    isFeatured: input.isFeatured !== undefined ? input.isFeatured : existingMapped.isFeatured,
    registrationStartsAt: input.registrationStartsAt !== undefined ? input.registrationStartsAt : existingMapped.registrationStartsAt,
    registrationEndsAt: input.registrationEndsAt !== undefined ? input.registrationEndsAt : existingMapped.registrationEndsAt,
  })

  const { data, error } = await supabase
    .from('live_webinars')
    .update({
      title: input.title !== undefined ? input.title : existingMapped.title,
      description: fullDescription,
      provider: input.provider !== undefined ? input.provider : existingMapped.provider,
      join_url: input.joinUrl !== undefined ? input.joinUrl : existingMapped.joinUrl,
      starts_at: input.startsAt !== undefined ? input.startsAt : existingMapped.startsAt,
      ends_at: input.endsAt !== undefined ? input.endsAt : existingMapped.endsAt,
      access_type: input.access !== undefined ? input.access : existingMapped.access,
      price: input.price !== undefined ? Math.max(0, Number(input.price)) : existingMapped.price,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update live webinar: ${error.message}`)
  return mapLiveRow(data as unknown as LiveWebinarRow)
}

export async function deleteLiveWebinar(id: string): Promise<void> {
  const { error } = await supabase.from('live_webinars').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete live webinar: ${error.message}`)
}

export async function uploadSpeakerPhoto(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '-')
  const path = `webinars/speakers/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from('course-thumbnails')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) {
    const b2Ref = await uploadToBackblaze(file, path)
    return getBackblazeVideoUrl(b2Ref)
  }

  const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
  return data.publicUrl
}

// Backward compatibility type definitions
export type FeaturedSpeakerSettings = Partial<LiveWebinar> & {
  isEnabled?: boolean
  hasSavedConfig?: boolean
  speakerName?: string
  badgeText?: string
  photoUrl?: string
  bioParagraphs?: string[]
  registrationUrl?: string
  registrationDeadline?: string | null
}
export const DEFAULT_FEATURED_SPEAKER: FeaturedSpeakerSettings = {
  isEnabled: false,
  hasSavedConfig: false,
}
export async function getFeaturedSpeakerSettings(): Promise<FeaturedSpeakerSettings> {
  const webinars = await getLiveWebinars()
  const featured = webinars.find(w => w.isFeatured || w.speakerName) || webinars[0]
  if (!featured) return { isEnabled: false, hasSavedConfig: false }
  return {
    isEnabled: true,
    hasSavedConfig: true,
    speakerName: featured.speakerName || '',
    badgeText: featured.speakerBadge || 'Featured Speaker',
    photoUrl: featured.speakerPhotoUrl || '',
    bioParagraphs: featured.speakerBio || [featured.description],
    tags: featured.tags || [],
    highlights: featured.highlights || [],
    registrationUrl: featured.joinUrl || '',
    registrationDeadline: featured.startsAt,
  }
}
export async function updateFeaturedSpeakerSettings(_input: any): Promise<any> {
  return {}
}

