import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Enrollment {
  id: string
  courseId: string
  userId: string
  itemType: 'course' | 'premium_membership' | 'resource' | 'subject_bundle' | 'resource_bundle' | 'semester_bundle'
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
  notes?: string
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
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load enrollments: ${error.message}`)
  return (data ?? []).map(mapEnrollment)
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
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

  // If this enrolled course is a Course Bundle, also enroll the user into all child courses
  try {
    const cleanId = String(input.courseId).replace(/^course_/, '')
    const { data: courseRow } = await supabase
      .from('site_courses')
      .select('tags')
      .eq('id', cleanId)
      .maybeSingle()

    if (courseRow?.tags?.includes('__is_course_bundle')) {
      const bTag = courseRow.tags.find((t: string) => t.startsWith('__bundled_courses:'))
      if (bTag) {
        const childIds = bTag.slice('__bundled_courses:'.length).split(',').map((s: string) => s.trim()).filter(Boolean)
        for (const cid of childIds) {
          try {
            await supabase.from('enrollments').upsert({
              item_type: 'course',
              item_id: cid,
              item_title: `Course #${cid} (via ${input.itemTitle || 'Bundle'})`,
              user_id: input.userId,
              first_name: input.firstName,
              last_name: input.lastName,
              email: input.email,
              phone: input.phone,
              payment_status: input.status,
              amount: 0,
              utr_number: input.utrNumber || '',
              screenshot_url: input.screenshotUrl || '',
              status: 'active',
            }, { onConflict: 'user_id,item_type,item_id' })
          } catch {
            // non-fatal fallback
          }
        }
      }
    }
  } catch (err) {
    console.warn('[createEnrollment] Error auto-enrolling child courses for bundle:', err)
  }

  return mapEnrollment(data)
}

export interface SubmitPaymentProofInput {
  userId: string
  itemType: 'course' | 'premium_membership' | 'subject_bundle' | 'resource'
  itemId: string
  itemTitle: string
  firstName: string
  lastName: string
  email: string
  phone: string
  amount: number
  utrNumber: string
  screenshotUrl: string
  // Pricing snapshot — stored for audit trail and admin review
  originalAmount?: number
  productDiscountAmount?: number
  couponCode?: string | null
  couponDiscountAmount?: number
  appliedDiscountId?: string | null
  appliedCouponId?: string | null
}

export async function submitPaymentProof(input: SubmitPaymentProofInput): Promise<Enrollment> {
  const payload: Record<string, unknown> = {
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
  }

  // Store pricing snapshot if provided
  if (input.originalAmount !== undefined)       payload.original_amount         = input.originalAmount
  if (input.productDiscountAmount !== undefined) payload.product_discount_amount = input.productDiscountAmount
  if (input.couponCode !== undefined)           payload.coupon_code             = input.couponCode
  if (input.couponDiscountAmount !== undefined)  payload.coupon_discount_amount  = input.couponDiscountAmount
  if (input.appliedDiscountId !== undefined)    payload.applied_discount_id     = input.appliedDiscountId
  if (input.appliedCouponId !== undefined)      payload.applied_coupon_id       = input.appliedCouponId

  const { data, error } = await supabase
    .from('enrollments')
    .upsert(
      payload,
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
      status: 'active',
      reviewed_at: new Date().toISOString(),
      rejection_reason: '',
    })
    .eq('id', enrollmentId)
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to approve payment: ${error.message}`)

  await syncApproveItemPurchases(data)

  return mapEnrollment(data)
}

// ─── Comprehensive Entitlement Approval & Restoration Helper ─────────────────
async function syncApproveItemPurchases(data: any): Promise<void> {
  if (!data) return
  const nowIso = new Date().toISOString()
  const rawItemId = String(data.item_id || '')
  const rawBundleId = rawItemId.split(':')[0]
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawBundleId)
  const numId = Number(rawBundleId)
  const isNum = !isNaN(numId) && rawBundleId !== '' && String(numId) === rawBundleId.trim()

  // 1. If it was a premium membership purchase, grant is_premium = true on user's profile
  if (data.item_type === 'premium_membership' && data.user_id) {
    try {
      await supabase
        .from('profiles')
        .update({ is_premium: true, updated_at: nowIso })
        .eq('id', data.user_id)
    } catch (e) {
      console.warn('[syncApproveItemPurchases] Could not set is_premium on profile:', e)
    }
  }

  // 2. If it was a course purchase, increment enrolled count on site_courses and sync bundled courses
  if (data.item_type === 'course' && data.item_id) {
    try {
      const cleanCourseId = String(data.item_id).replace(/^course_/, '')
      const { data: course } = await supabase
        .from('site_courses')
        .select('enrolled, is_course_bundle, bundled_course_ids')
        .eq('id', cleanCourseId)
        .maybeSingle()
      if (course) {
        // Increment enrolled count on the bundle/course itself
        await supabase
          .from('site_courses')
          .update({ enrolled: (course.enrolled ?? 0) + 1 })
          .eq('id', cleanCourseId)

        // If this is a Course Bundle, also create paid enrollments for every child course
        if (course.is_course_bundle && Array.isArray(course.bundled_course_ids) && course.bundled_course_ids.length > 0 && data.user_id) {
          for (const rawCid of course.bundled_course_ids) {
            const cid = String(rawCid).replace(/^course_/, '')
            if (!cid) continue
            try {
              await supabase.from('enrollments').upsert({
                item_type:      'course',
                item_id:        cid,
                item_title:     `Individual Course #${cid} (via ${data.item_title || 'Bundle'})`,
                user_id:        data.user_id,
                first_name:     data.first_name || '',
                last_name:      data.last_name  || '',
                email:          data.email      || '',
                phone:          data.phone      || '',
                payment_status: 'paid',
                amount:         0,
                utr_number:     data.utr_number      || '',
                screenshot_url: data.screenshot_url  || '',
                status:         'active',
              }, { onConflict: 'user_id,item_type,item_id' })
            } catch {
              // non-fatal — individual child enrollment failure doesn't block the bundle
            }
          }
        }
      }
    } catch (e) {
      console.warn('[syncApproveItemPurchases] Could not handle course/bundle approval:', e)
    }
  }

  // 3. If it was a subject bundle purchase, activate the entitlement atomically
  if (data.item_type === 'subject_bundle' || data.item_title?.toLowerCase().includes('subject bundle')) {
    try {
      // Direct update into subject_bundle_purchases by enrollment_id
      await supabase
        .from('subject_bundle_purchases')
        .update({
          payment_status: 'paid',
          status: 'active',
          approved_at: nowIso,
          starts_at: nowIso,
          updated_at: nowIso,
        })
        .eq('enrollment_id', data.id)

      if (data.user_id) {
        if (isUuid) {
          await supabase
            .from('subject_bundle_purchases')
            .update({
              payment_status: 'paid',
              status: 'active',
              approved_at: nowIso,
              starts_at: nowIso,
              updated_at: nowIso,
              enrollment_id: data.id,
            })
            .eq('user_id', data.user_id)
            .eq('bundle_id', rawBundleId)
        }
        if (isNum) {
          await supabase
            .from('subject_bundle_purchases')
            .update({
              payment_status: 'paid',
              status: 'active',
              approved_at: nowIso,
              starts_at: nowIso,
              updated_at: nowIso,
              enrollment_id: data.id,
            })
            .eq('user_id', data.user_id)
            .eq('subject_id', numId)
        }
      }

      // Also attempt RPC if present
      const authUser = (await supabase.auth.getUser()).data.user
      const adminId = authUser?.id || data.user_id
      await supabase.rpc('approve_subject_bundle_purchase', {
        p_enrollment_id: data.id,
        p_admin_id: adminId,
      })
    } catch (e) {
      console.warn('[syncApproveItemPurchases] Could not activate subject bundle via RPC:', e)
    }
  }

  // 4. If it was a resource bundle purchase, activate the entitlement atomically
  if (data.item_type === 'resource_bundle' || data.item_title?.toLowerCase().includes('resource bundle')) {
    try {
      // Direct update into resource_bundle_purchases by enrollment_id
      await supabase
        .from('resource_bundle_purchases')
        .update({
          payment_status: 'paid',
          status: 'active',
          approved_at: nowIso,
          starts_at: nowIso,
          updated_at: nowIso,
        })
        .eq('enrollment_id', data.id)

      if (data.user_id) {
        if (isUuid) {
          await supabase
            .from('resource_bundle_purchases')
            .update({
              payment_status: 'paid',
              status: 'active',
              approved_at: nowIso,
              starts_at: nowIso,
              updated_at: nowIso,
              enrollment_id: data.id,
            })
            .eq('user_id', data.user_id)
            .eq('bundle_id', rawBundleId)
        }
        if (isNum) {
          await supabase
            .from('resource_bundle_purchases')
            .update({
              payment_status: 'paid',
              status: 'active',
              approved_at: nowIso,
              starts_at: nowIso,
              updated_at: nowIso,
              enrollment_id: data.id,
            })
            .eq('user_id', data.user_id)
            .eq('subject_id', numId)
        }
      }

      // Also attempt RPC if present
      const authUser = (await supabase.auth.getUser()).data.user
      const adminId = authUser?.id || data.user_id
      await supabase.rpc('approve_resource_bundle_purchase', {
        p_enrollment_id: data.id,
        p_admin_id: adminId,
      })
    } catch (e) {
      console.warn('[syncApproveItemPurchases] Could not activate resource bundle via RPC:', e)
    }
  }

  // 5. If it was a semester bundle purchase, activate the entitlement atomically
  if (data.item_type === 'semester_bundle' || data.item_title?.toLowerCase().includes('semester bundle')) {
    try {
      // Direct update into semester_bundle_purchases by enrollment_id
      await supabase
        .from('semester_bundle_purchases')
        .update({
          payment_status: 'paid',
          status: 'active',
          approved_at: nowIso,
          starts_at: nowIso,
          updated_at: nowIso,
        })
        .eq('enrollment_id', data.id)

      if (data.user_id) {
        if (isUuid) {
          await supabase
            .from('semester_bundle_purchases')
            .update({
              payment_status: 'paid',
              status: 'active',
              approved_at: nowIso,
              starts_at: nowIso,
              updated_at: nowIso,
              enrollment_id: data.id,
            })
            .eq('user_id', data.user_id)
            .eq('bundle_id', rawBundleId)
        }
        if (isNum) {
          await supabase
            .from('semester_bundle_purchases')
            .update({
              payment_status: 'paid',
              status: 'active',
              approved_at: nowIso,
              starts_at: nowIso,
              updated_at: nowIso,
              enrollment_id: data.id,
            })
            .eq('user_id', data.user_id)
            .eq('semester_id', numId)
        }
      }

      // Also attempt RPC if present
      const authUser = (await supabase.auth.getUser()).data.user
      const adminId = authUser?.id || data.user_id
      await supabase.rpc('approve_semester_bundle_purchase', {
        p_enrollment_id: data.id,
        p_admin_id: adminId,
      })
    } catch (e) {
      console.warn('[syncApproveItemPurchases] Could not activate semester bundle via RPC:', e)
    }
  }
}

// ─── Comprehensive Entitlement Revocation Helper ────────────────────────────
async function syncRevokeItemPurchases(data: any, _reason: string): Promise<void> {
  const nowIso = new Date().toISOString()
  const rawItemId = String(data.item_id || '')
  const rawBundleId = rawItemId.split(':')[0]
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawBundleId)
  const numId = Number(rawBundleId)
  const isNum = !isNaN(numId) && rawBundleId !== '' && String(numId) === rawBundleId.trim()

  // 1. Premium Membership revocation
  if ((data.item_type === 'premium_membership' || data.item_title?.toLowerCase().includes('premium')) && data.user_id) {
    try {
      await supabase
        .from('profiles')
        .update({ is_premium: false, updated_at: nowIso })
        .eq('id', data.user_id)
    } catch (e) {
      console.warn('[syncRevokeItemPurchases] Could not revoke is_premium on profile:', e)
    }
  }

  // 2. Course / Course Bundle purchase revocation
  if (data.item_type === 'course' && data.item_id) {
    try {
      const cleanCourseId = String(data.item_id).replace(/^course_/, '')
      const { data: course } = await supabase
        .from('site_courses')
        .select('enrolled, is_course_bundle, bundled_course_ids')
        .eq('id', cleanCourseId)
        .maybeSingle()

      // Decrement enrolled count
      if (course && (course.enrolled ?? 0) > 0) {
        await supabase
          .from('site_courses')
          .update({ enrolled: Math.max(0, (course.enrolled ?? 1) - 1) })
          .eq('id', cleanCourseId)
      }

      // If Course Bundle — also revoke all child course enrollments
      if (course?.is_course_bundle && Array.isArray(course.bundled_course_ids) && data.user_id) {
        for (const rawCid of course.bundled_course_ids) {
          const cid = String(rawCid).replace(/^course_/, '')
          if (!cid) continue
          try {
            await supabase
              .from('enrollments')
              .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
              .eq('user_id', data.user_id)
              .eq('item_type', 'course')
              .in('item_id', [cid, `course_${cid}`])
              .in('payment_status', ['paid', 'free', 'pending'])
          } catch {
            // non-fatal
          }
        }
      }
    } catch (e) {
      console.warn('[syncRevokeItemPurchases] Could not revoke course/bundle:', e)
    }
  }

  // 3. Subject bundle purchase revocation
  if (data.item_type === 'subject_bundle' || data.item_title?.toLowerCase().includes('subject bundle')) {
    try {
      await supabase
        .from('subject_bundle_purchases')
        .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
        .eq('enrollment_id', data.id)

      if (data.user_id) {
        if (isUuid) {
          await supabase
            .from('subject_bundle_purchases')
            .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
            .eq('user_id', data.user_id)
            .eq('bundle_id', rawBundleId)
        }
        if (isNum) {
          await supabase
            .from('subject_bundle_purchases')
            .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
            .eq('user_id', data.user_id)
            .eq('subject_id', numId)
        }
      }
    } catch (e) {
      console.warn('[syncRevokeItemPurchases] Could not revoke subject_bundle_purchases:', e)
    }
  }

  // 4. Resource bundle purchase revocation
  if (data.item_type === 'resource_bundle' || data.item_title?.toLowerCase().includes('resource bundle')) {
    try {
      await supabase
        .from('resource_bundle_purchases')
        .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
        .eq('enrollment_id', data.id)

      if (data.user_id) {
        if (isUuid) {
          await supabase
            .from('resource_bundle_purchases')
            .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
            .eq('user_id', data.user_id)
            .eq('bundle_id', rawBundleId)
        }
        if (isNum) {
          await supabase
            .from('resource_bundle_purchases')
            .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
            .eq('user_id', data.user_id)
            .eq('subject_id', numId)
        }
      }
    } catch (e) {
      console.warn('[syncRevokeItemPurchases] Could not revoke resource_bundle_purchases:', e)
    }
  }

  // 5. Semester bundle purchase revocation
  if (data.item_type === 'semester_bundle' || data.item_title?.toLowerCase().includes('semester bundle')) {
    try {
      await supabase
        .from('semester_bundle_purchases')
        .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
        .eq('enrollment_id', data.id)

      if (data.user_id) {
        if (isUuid) {
          await supabase
            .from('semester_bundle_purchases')
            .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
            .eq('user_id', data.user_id)
            .eq('bundle_id', rawBundleId)
        }
        if (isNum) {
          await supabase
            .from('semester_bundle_purchases')
            .update({ payment_status: 'rejected', status: 'revoked', updated_at: nowIso })
            .eq('user_id', data.user_id)
            .eq('semester_id', numId)
        }
      }
    } catch (e) {
      console.warn('[syncRevokeItemPurchases] Could not revoke semester_bundle_purchases:', e)
    }
  }
}

export async function rejectPaymentRequest(enrollmentId: string, reason: string): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .update({
      payment_status: 'rejected',
      status: 'cancelled',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to reject payment: ${error.message}`)

  await syncRevokeItemPurchases(data, reason)

  return mapEnrollment(data)
}

export async function revokeAccess(enrollmentId: string, reason = 'Access revoked by Skills021'): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('enrollments')
    .update({
      payment_status: 'rejected',
      status: 'cancelled',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('id, item_type, item_id, item_title, user_id, first_name, last_name, email, phone, payment_status, amount, utr_number, screenshot_url, rejection_reason, reviewed_at, created_at, status')
    .single()

  if (error) throw new Error(`Failed to revoke access: ${error.message}`)

  await syncRevokeItemPurchases(data, reason)

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
  const isRejected = row.payment_status === 'rejected' || row.status === 'rejected' || row.status === 'revoked' || row.status === 'cancelled'
  // NOTE: Do NOT treat status='active' alone as paid — that bypasses admin approval.
  // Only explicit payment_status values grant access.
  const isPaid = row.payment_status === 'paid' && !isRejected
  const isFree = row.payment_status === 'free' && !isRejected
  const status = isRejected ? 'rejected' : isPaid ? 'paid' : isFree ? 'free' : 'pending'

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
    status,
    amount: Number(row.amount || 0),
    utrNumber: row.utr_number || '',
    screenshotUrl: row.screenshot_url || '',
    rejectionReason: row.rejection_reason || '',
    reviewedAt: row.reviewed_at || undefined,
    createdAt: row.created_at,
    notes: row.notes || undefined,
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
