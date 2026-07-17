import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Enrollment {
  id: string
  courseId: string
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: 'pending' | 'paid' | 'free'
  amount: number
  createdAt: string
}

export type RatingType = 'course' | 'instructor'

export interface RatingSummary {
  average: number
  count: number
  userRating: number | null // current user's own rating, if any
  userFeedback: string | null // current user's own feedback text, if any
}

export interface VideoComment {
  id: string
  courseId: string
  userId: string
  userName: string
  comment: string
  createdAt: string
}

export interface RatingEntry {
  id: string
  courseId: string
  ratingType: RatingType
  userId: string
  userName: string
  rating: number
  feedback: string | null
  createdAt: string
}

export interface VideoTimestamp {
  id: string
  courseId: string
  timeSeconds: number
  label: string
  sortOrder: number
}

// The 'instructor' rating in the app maps to item_type 'teacher' in the DB,
// since that's the value your existing item_ratings table's check constraint allows.
function toItemRatingType(t: RatingType): 'course' | 'teacher' {
  return t === 'instructor' ? 'teacher' : 'course'
}

// ─── Enrollment ──────────────────────────────────────────────────────────────
export async function getEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('item_type', 'course')
    .eq('item_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to check enrollment: ${error.message}`)
  if (!data) return null
  return mapEnrollment(data)
}

export async function getEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('item_type', 'course')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to load enrollments: ${error.message}`)
  return (data ?? []).map(mapEnrollment)
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('item_type', 'course')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load enrollments: ${error.message}`)
  return (data ?? []).map(mapEnrollment)
}

export interface EnrollInput {
  courseId: string
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: 'pending' | 'paid' | 'free'
  amount: number
}

export async function createEnrollment(input: EnrollInput): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert({
      item_type: 'course',
      item_id: input.courseId,
      user_id: input.userId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      payment_status: input.status,
      amount: input.amount,
      status: 'active',
    }, { onConflict: 'user_id,item_type,item_id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to enroll: ${error.message}`)

  // Best-effort: bump the course's public "enrolled" counter used on cards.
  try {
    const { data: course } = await supabase.from('site_courses').select('enrolled').eq('id', input.courseId).single()
    if (course) {
      await supabase.from('site_courses').update({ enrolled: (course.enrolled ?? 0) + 1 }).eq('id', input.courseId)
    }
  } catch {
    // non-critical, ignore
  }

  return mapEnrollment(data)
}

export async function markEnrollmentPaid(enrollmentId: string): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .update({ payment_status: 'paid' })
    .eq('id', enrollmentId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update enrollment: ${error.message}`)
  return mapEnrollment(data)
}

function mapEnrollment(row: any): Enrollment {
  return {
    id: row.id,
    courseId: String(row.item_id),
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? '',
    status: row.payment_status ?? 'free',
    amount: Number(row.amount ?? 0),
    createdAt: row.created_at,
  }
}

// ─── Ratings ─────────────────────────────────────────────────────────────────
export async function getRatingSummary(courseId: string, ratingType: RatingType, userId?: string): Promise<RatingSummary> {
  const { data, error } = await supabase
    .from('item_ratings')
    .select('user_id, rating, feedback')
    .eq('item_type', toItemRatingType(ratingType))
    .eq('item_id', courseId)

  if (error) throw new Error(`Failed to load ratings: ${error.message}`)
  const rows = data ?? []
  const count = rows.length
  const average = count > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / count : 0
  const userRow = userId ? rows.find(r => r.user_id === userId) : undefined

  return {
    average: Math.round(average * 10) / 10,
    count,
    userRating: userRow ? userRow.rating : null,
    userFeedback: userRow ? (userRow.feedback ?? null) : null,
  }
}

export async function submitRating(
  courseId: string, userId: string, ratingType: RatingType, rating: number, feedback?: string
): Promise<void> {
  const { error } = await supabase
    .from('item_ratings')
    .upsert({
      item_type: toItemRatingType(ratingType),
      item_id: courseId,
      user_id: userId,
      rating,
      feedback: feedback || null,
    }, { onConflict: 'user_id,item_type,item_id' })

  if (error) throw new Error(`Failed to submit rating: ${error.message}`)

  // Keep the course's public rating/reviews counters (shown on course cards,
  // including the homepage courses section) in sync with real ratings.
  if (ratingType === 'course') {
    await syncCourseRatingAggregate(courseId).catch(() => {})
  }
}

// Recompute the average rating + review count for a course from item_ratings
// and write it back onto site_courses so every card that reads
// course.rating / course.reviews (homepage, /courses page, etc.) reflects it.
async function syncCourseRatingAggregate(courseId: string): Promise<void> {
  const { data, error } = await supabase
    .from('item_ratings')
    .select('rating')
    .eq('item_type', 'course')
    .eq('item_id', courseId)

  if (error || !data) return

  const count = data.length
  if (count === 0) {
    await supabase.from('site_courses').update({ reviews: 0 }).eq('id', courseId)
    return
  }

  const average = Math.round((data.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
  await supabase.from('site_courses').update({ rating: average, reviews: count }).eq('id', courseId)
}

// ─── Admin: list & moderate individual ratings ─────────────────────────────
export async function getRatingsList(courseId: string, ratingType: RatingType): Promise<RatingEntry[]> {
  const [{ data: ratings, error }, { data: enrollments }] = await Promise.all([
    supabase
      .from('item_ratings')
      .select('id, user_id, rating, feedback, created_at')
      .eq('item_type', toItemRatingType(ratingType))
      .eq('item_id', courseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('enrollments')
      .select('user_id, first_name, last_name, email')
      .eq('item_type', 'course')
      .eq('item_id', courseId),
  ])

  if (error) throw new Error(`Failed to load ratings: ${error.message}`)

  const nameByUser = new Map<string, string>()
  for (const e of enrollments ?? []) {
    const name = `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim()
    nameByUser.set(e.user_id, name || e.email || 'Student')
  }

  return (ratings ?? []).map((r: any) => ({
    id: r.id,
    courseId,
    ratingType,
    userId: r.user_id,
    userName: nameByUser.get(r.user_id) ?? 'Student',
    rating: r.rating,
    feedback: r.feedback ?? null,
    createdAt: r.created_at,
  }))
}

export async function deleteRating(id: string): Promise<void> {
  const { data: row } = await supabase
    .from('item_ratings')
    .select('item_type, item_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('item_ratings').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete rating: ${error.message}`)

  if (row?.item_type === 'course') {
    await syncCourseRatingAggregate(String(row.item_id)).catch(() => {})
  }
}

// ─── Comments ────────────────────────────────────────────────────────────────
export async function getComments(courseId: string): Promise<VideoComment[]> {
  const { data, error } = await supabase
    .from('item_comments')
    .select('*')
    .eq('item_type', 'course')
    .eq('item_id', courseId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load comments: ${error.message}`)
  return (data ?? []).map(mapComment)
}

export async function addComment(courseId: string, userId: string, userName: string, comment: string): Promise<VideoComment> {
  const { data, error } = await supabase
    .from('item_comments')
    .insert({ item_type: 'course', item_id: courseId, user_id: userId, user_name: userName, comment_text: comment })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to post comment: ${error.message}`)
  return mapComment(data)
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('item_comments').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete comment: ${error.message}`)
}

function mapComment(row: any): VideoComment {
  return {
    id: row.id,
    courseId: String(row.item_id),
    userId: row.user_id,
    userName: row.user_name,
    comment: row.comment_text,
    createdAt: row.created_at,
  }
}

// ─── Timestamps / Chapters ────────────────────────────────────────────────────
export async function getTimestamps(courseId: string): Promise<VideoTimestamp[]> {
  const { data, error } = await supabase
    .from('item_timestamps')
    .select('*')
    .eq('item_type', 'course')
    .eq('item_id', courseId)
    .order('sort_order', { ascending: true })
    .order('time_seconds', { ascending: true })

  if (error) throw new Error(`Failed to load timestamps: ${error.message}`)
  return (data ?? []).map(mapTimestamp)
}

export async function addTimestamp(courseId: string, timeSeconds: number, label: string, sortOrder = 0): Promise<VideoTimestamp> {
  const { data, error } = await supabase
    .from('item_timestamps')
    .insert({ item_type: 'course', item_id: courseId, time_seconds: timeSeconds, label, sort_order: sortOrder })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to add timestamp: ${error.message}`)
  return mapTimestamp(data)
}

export async function deleteTimestamp(id: string): Promise<void> {
  const { error } = await supabase.from('item_timestamps').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete timestamp: ${error.message}`)
}

function mapTimestamp(row: any): VideoTimestamp {
  return {
    id: row.id,
    courseId: String(row.item_id),
    timeSeconds: row.time_seconds,
    label: row.label,
    sortOrder: row.sort_order ?? 0,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function parseTimeToSeconds(input: string): number {
  const trimmed = input.trim()
  // Accept both "mm:ss" and "mm.ss" as minute:second notation (many people type
  // a period out of habit, like a stopwatch reading, e.g. "0.05" = 0 min 5 sec).
  const separator = trimmed.includes(':') ? ':' : (trimmed.includes('.') ? '.' : null)
  if (separator) {
    const parts = trimmed.split(separator).map(p => parseInt(p, 10) || 0)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return parts[0] || 0
  }
  // No separator at all — treat as a plain whole number of seconds.
  const asNumber = parseInt(trimmed, 10)
  return isNaN(asNumber) ? 0 : asNumber
}
