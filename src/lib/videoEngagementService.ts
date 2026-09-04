import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Enrollment {
  id: string
  courseId: string
  userId: string
  itemType: 'course' | 'premium_membership' | 'resource'
  itemTitle?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: 'pending' | 'paid' | 'free' | 'rejected'
  amount: number
  utrNumber?: string
  screenshotUrl?: string
  rejectionReason?: string
  reviewedAt?: string
  createdAt: string
}

export interface PaymentSettings {
  id?: string
  upiId: string
  upiName: string
  qrCodeUrl: string
  instructions?: string
  allAccessPrice?: number
  updatedAt?: string
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

// Personal notes a student takes while watching a course video. Private to
// the user who wrote them — only that user can see/edit/delete their own.
export interface VideoNote {
  id: string
  courseId: string
  userId: string
  noteText: string
  timeSeconds: number | null
  createdAt: string
}

// The 'instructor' rating in the app maps to item_type 'teacher' in the DB,
// since that's the value your existing item_ratings table's check constraint allows.
function toItemRatingType(t: RatingType): 'course' | 'teacher' {
  return t === 'instructor' ? 'teacher' : 'course'
}

// ─── Enrollment & Payment Verification ───────────────────────────────────────
export async function getEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at')
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
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load enrollments: ${error.message}`)
  return (data ?? []).map(mapEnrollment)
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at')
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
  status: 'pending' | 'paid' | 'free' | 'rejected'
  amount: number
  itemTitle?: string
  utrNumber?: string
  screenshotUrl?: string
  itemType?: 'course' | 'premium_membership' | 'resource' | 'webinar'
}

export async function createEnrollment(input: EnrollInput): Promise<Enrollment> {
  const itemType = input.itemType || 'course'
  const { data, error } = await supabase
    .from('enrollments')
    .upsert({
      item_type: itemType,
      item_id: input.courseId,
      item_title: input.itemTitle || `${itemType} #${input.courseId}`,
      user_id: input.userId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      payment_status: input.status,
      amount: input.amount,
      utr_number: input.utrNumber || '',
      screenshot_url: input.screenshotUrl || '',
      status: 'active',
    }, { onConflict: 'user_id,item_type,item_id' })
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to submit enrollment: ${error.message}`)
  return mapEnrollment(data)
}

export interface SubmitPaymentProofInput {
  userId: string
  itemType: 'course' | 'premium_membership'
  itemId: string
  itemTitle: string
  firstName: string
  lastName: string
  email: string
  phone: string
  amount: number
  utrNumber: string
  screenshotUrl: string
}

export async function submitPaymentProof(input: SubmitPaymentProofInput): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .upsert(
      {
        item_type: input.itemType,
        item_id: input.itemId,
        item_title: input.itemTitle,
        user_id: input.userId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        payment_status: 'pending',
        amount: input.amount,
        utr_number: input.utrNumber.trim(),
        screenshot_url: input.screenshotUrl,
        status: 'active',
      },
      { onConflict: 'user_id,item_type,item_id' }
    )
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to submit payment verification proof: ${error.message}`)
  return mapEnrollment(data)
}

export async function approvePaymentRequest(enrollmentId: string): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .update({
      payment_status: 'paid',
      reviewed_at: new Date().toISOString(),
      rejection_reason: '',
    })
    .eq('id', enrollmentId)
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to approve payment: ${error.message}`)

  // If it was a premium membership purchase, grant is_premium = true on user's profile
  if (data.item_type === 'premium_membership' && data.user_id) {
    try {
      await supabase
        .from('profiles')
        .update({ is_premium: true, updated_at: new Date().toISOString() })
        .eq('id', data.user_id)
    } catch (e) {
      console.warn('Could not set is_premium on profile:', e)
    }
  }

  // If it was a course purchase, increment enrolled count on site_courses
  if (data.item_type === 'course' && data.item_id) {
    try {
      const { data: course } = await supabase
        .from('site_courses')
        .select('enrolled')
        .eq('id', data.item_id)
        .single()
      if (course) {
        await supabase
          .from('site_courses')
          .update({ enrolled: (course.enrolled ?? 0) + 1 })
          .eq('id', data.item_id)
      }
    } catch {}
  }

  return mapEnrollment(data)
}

export async function rejectPaymentRequest(enrollmentId: string, reason: string): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .update({
      payment_status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to reject payment: ${error.message}`)
  return mapEnrollment(data)
}

export async function revokeAccess(enrollmentId: string, reason = 'Access revoked by Skills021'): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .update({
      payment_status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to revoke access: ${error.message}`)

  // If this was a premium membership, also revoke is_premium on the profile
  if (data.item_type === 'premium_membership' && data.user_id) {
    try {
      await supabase
        .from('profiles')
        .update({ is_premium: false, updated_at: new Date().toISOString() })
        .eq('id', data.user_id)
    } catch (e) {
      console.warn('Could not revoke is_premium on profile:', e)
    }
  }

  return mapEnrollment(data)
}

export async function deleteEnrollmentRecord(enrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId)

  if (error) throw new Error(`Failed to delete enrollment: ${error.message}`)
}

export async function markEnrollmentPaid(enrollmentId: string): Promise<Enrollment> {
  return approvePaymentRequest(enrollmentId)
}

function mapEnrollment(row: any): Enrollment {
  return {
    id: row.id,
    courseId: String(row.item_id),
    userId: row.user_id,
    itemType: (row.item_type || 'course') as any,
    itemTitle: row.item_title || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    status: row.payment_status || 'pending',
    amount: Number(row.amount || 0),
    utrNumber: row.utr_number || '',
    screenshotUrl: row.screenshot_url || '',
    rejectionReason: row.rejection_reason || '',
    reviewedAt: row.reviewed_at || undefined,
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
}

// ─── Comments ────────────────────────────────────────────────────────────────
export async function getComments(courseId: string): Promise<VideoComment[]> {
  const { data, error } = await supabase
    .from('item_comments')
    .select('id, item_id, user_id, user_name, comment_text, created_at')
    .eq('item_type', 'course')
    .eq('item_id', courseId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load comments: ${error.message}`)
  return (data ?? []).map(r => ({
    id: r.id,
    courseId: String(r.item_id),
    userId: r.user_id,
    userName: r.user_name || 'Anonymous',
    comment: r.comment_text,
    createdAt: r.created_at,
  }))
}

export async function addComment(courseId: string, userId: string, userName: string, comment: string): Promise<VideoComment> {
  const { data, error } = await supabase
    .from('item_comments')
    .insert({
      item_type: 'course',
      item_id: courseId,
      user_id: userId,
      user_name: userName,
      comment_text: comment.trim(),
    })
    .select('id, item_id, user_id, user_name, comment_text, created_at')
    .single()

  if (error) throw new Error(`Failed to post comment: ${error.message}`)
  return {
    id: data.id,
    courseId: String(data.item_id),
    userId: data.user_id,
    userName: data.user_name || userName,
    comment: data.comment_text,
    createdAt: data.created_at,
  }
}

export async function deleteComment(commentId: string, userId?: string): Promise<void> {
  let query = supabase.from('item_comments').delete().eq('id', commentId)
  if (userId) {
    query = query.eq('user_id', userId)
  }
  const { error } = await query

  if (error) throw new Error(`Failed to delete comment: ${error.message}`)
}

// ─── Timestamps ──────────────────────────────────────────────────────────────
export async function getTimestamps(courseId: string): Promise<VideoTimestamp[]> {
  const { data, error } = await supabase
    .from('item_timestamps')
    .select('id, item_id, time_seconds, label, sort_order')
    .eq('item_type', 'course')
    .eq('item_id', courseId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load timestamps: ${error.message}`)
  return (data ?? []).map(r => ({
    id: r.id,
    courseId: String(r.item_id),
    timeSeconds: r.time_seconds,
    label: r.label,
    sortOrder: r.sort_order,
  }))
}

export async function addTimestamp(
  courseId: string,
  timeSeconds: number,
  label: string,
  sortOrder?: number
): Promise<VideoTimestamp> {
  const { data, error } = await supabase
    .from('item_timestamps')
    .insert({
      item_type: 'course',
      item_id: courseId,
      time_seconds: timeSeconds,
      label: label.trim(),
      sort_order: sortOrder ?? 0,
    })
    .select('id, item_id, time_seconds, label, sort_order')
    .single()

  if (error) throw new Error(`Failed to add timestamp: ${error.message}`)
  return {
    id: data.id,
    courseId: String(data.item_id),
    timeSeconds: data.time_seconds,
    label: data.label,
    sortOrder: data.sort_order,
  }
}

export async function deleteTimestamp(timestampId: string): Promise<void> {
  const { error } = await supabase
    .from('item_timestamps')
    .delete()
    .eq('id', timestampId)

  if (error) throw new Error(`Failed to delete timestamp: ${error.message}`)
}

export function parseTimeToSeconds(timeStr: string): number {
  const value = timeStr.trim()
  if (!value) return NaN

  // Admin-friendly shorthand: 0.05 means 0 minutes 05 seconds,
  // 1.30 means 1 minute 30 seconds. This avoids the common mistake of
  // treating 0.05 as five hundredths of a second.
  if (/^\d+\.\d{1,2}$/.test(value)) {
    const [minutesText, secondsText] = value.split('.')
    const minutes = Number(minutesText)
    const seconds = Number(secondsText.padEnd(2, '0'))
    if (seconds >= 60) return NaN
    return minutes * 60 + seconds
  }

  const parts = value.split(':').map(Number)
  if (parts.some(part => !Number.isFinite(part) || part < 0)) return NaN
  if (parts.length === 2) {
    if (parts[1] >= 60) return NaN
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    if (parts[1] >= 60 || parts[2] >= 60) return NaN
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 1) return parts[0]
  return NaN
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Payment Settings (Admin Configurable UPI & QR Code) ─────────────────────
const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  id: 'default',
  upiId: 'skills021@upi',
  upiName: 'Skills021',
  qrCodeUrl: '',
  allAccessPrice: 999,
  instructions: 'Scan QR or pay directly to the UPI ID, then enter your 12-digit UTR number and upload screenshot proof.',
}

function parseInstructionsAndConfig(raw: string | undefined): { instructions: string; allAccessPrice: number } {
  if (!raw) return { instructions: DEFAULT_PAYMENT_SETTINGS.instructions || '', allAccessPrice: 999 }
  const match = raw.match(/<!--CONFIG:(.*?)-->/)
  let allAccessPrice = 999
  let cleanInstructions = raw
  if (match) {
    try {
      const parsed = JSON.parse(match[1])
      if (typeof parsed.allAccessPrice === 'number' && parsed.allAccessPrice > 0) {
        allAccessPrice = parsed.allAccessPrice
      }
      cleanInstructions = raw.replace(/<!--CONFIG:.*?-->/, '').trim()
    } catch {}
  }
  return { instructions: cleanInstructions, allAccessPrice }
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('id, upi_id, upi_name, qr_code_url, instructions, updated_at')
      .eq('id', 'default')
      .maybeSingle()

    if (data && !error) {
      const { instructions, allAccessPrice } = parseInstructionsAndConfig(data.instructions)
      const settings: PaymentSettings = {
        id: data.id,
        upiId: data.upi_id || DEFAULT_PAYMENT_SETTINGS.upiId,
        upiName: data.upi_name || DEFAULT_PAYMENT_SETTINGS.upiName,
        qrCodeUrl: data.qr_code_url || '',
        allAccessPrice: allAccessPrice || 999,
        instructions: instructions || DEFAULT_PAYMENT_SETTINGS.instructions,
        updatedAt: data.updated_at,
      }
      localStorage.setItem('skills021_payment_settings', JSON.stringify(settings))
      return settings
    }
  } catch (e) {
    console.warn('Could not load payment settings from Supabase:', e)
  }

  const cached = localStorage.getItem('skills021_payment_settings')
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      return {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...parsed,
        allAccessPrice: parsed.allAccessPrice || 999,
      }
    } catch {}
  }

  return DEFAULT_PAYMENT_SETTINGS
}

export async function updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
  const upiId = (settings.upiId || DEFAULT_PAYMENT_SETTINGS.upiId).trim()
  const upiName = (settings.upiName || DEFAULT_PAYMENT_SETTINGS.upiName).trim()
  const qrCodeUrl = (settings.qrCodeUrl ?? '').trim()
  const cleanInstructions = (settings.instructions ?? DEFAULT_PAYMENT_SETTINGS.instructions ?? '').trim()
  const allAccessPrice = settings.allAccessPrice && settings.allAccessPrice > 0 ? settings.allAccessPrice : 999

  // Embed config tag into instructions field for database persistence without altering table schema
  const payloadInstructions = `${cleanInstructions}\n<!--CONFIG:${JSON.stringify({ allAccessPrice })}-->`

  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({
        id: 'default',
        upi_id: upiId,
        upi_name: upiName,
        qr_code_url: qrCodeUrl,
        instructions: payloadInstructions,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('id, upi_id, upi_name, qr_code_url, instructions, updated_at')
      .single()

    if (error) throw error

    const { instructions: savedCleanInstructions, allAccessPrice: savedPrice } = parseInstructionsAndConfig(data.instructions)
    const result: PaymentSettings = {
      id: data.id,
      upiId: data.upi_id,
      upiName: data.upi_name,
      qrCodeUrl: data.qr_code_url,
      allAccessPrice: savedPrice,
      instructions: savedCleanInstructions,
      updatedAt: data.updated_at,
    }
    localStorage.setItem('skills021_payment_settings', JSON.stringify(result))
    return result
  } catch (err: any) {
    const fallback: PaymentSettings = {
      id: 'default',
      upiId,
      upiName,
      qrCodeUrl,
      allAccessPrice,
      instructions: cleanInstructions,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem('skills021_payment_settings', JSON.stringify(fallback))
    return fallback
  }
}
