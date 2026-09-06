// ============================================================================
// Skills021 — Centralized Bundle Authorization Service
// ============================================================================
import { supabase } from './supabase'

export interface UserEntitlements {
  subjectBundleSubjectIds: Set<number>
  resourceBundleItemIds: Set<number>
  resourceBundleSubjectIds: Set<number>
  enrolledCourseIds: Set<string>
  enrolledResourceIds: Set<number>
  pendingCourseIds: Set<string>
  pendingResourceIds: Set<number>
}

/**
 * Single batch query to fetch all active bundle entitlements and individual enrollments for a user.
 * Prevents N+1 database queries when rendering course lists or subject pages.
 */
export async function fetchUserEntitlements(userId: string | null | undefined): Promise<UserEntitlements> {
  const result: UserEntitlements = {
    subjectBundleSubjectIds: new Set<number>(),
    resourceBundleItemIds: new Set<number>(),
    resourceBundleSubjectIds: new Set<number>(),
    enrolledCourseIds: new Set<string>(),
    enrolledResourceIds: new Set<number>(),
    pendingCourseIds: new Set<string>(),
    pendingResourceIds: new Set<number>(),
  }

  if (!userId) return result

  const now = new Date()

  try {
    const [subjectRes, resourceRes, enrollmentRes] = await Promise.all([
      // Active subject bundles
      supabase
        .from('subject_bundle_purchases')
        .select('subject_id, expires_at')
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .eq('status', 'active'),

      // Active resource bundles with items
      supabase
        .from('resource_bundle_purchases')
        .select(`
          bundle_id,
          subject_id,
          expires_at,
          resource_bundles (
            resource_bundle_items ( resource_id )
          )
        `)
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .eq('status', 'active'),

      // Individual enrollments and bundle enrollments
      supabase
        .from('enrollments')
        .select('id, item_type, item_id, payment_status, status')
        .eq('user_id', userId),
    ])

    if (subjectRes.data) {
      for (const p of subjectRes.data) {
        if (!p.expires_at || new Date(p.expires_at) > now) {
          result.subjectBundleSubjectIds.add(Number(p.subject_id))
        }
      }
    }

    if (resourceRes.data) {
      for (const r of resourceRes.data) {
        if (!r.expires_at || new Date(r.expires_at) > now) {
          result.resourceBundleSubjectIds.add(Number(r.subject_id))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rb = r.resource_bundles as any
          const items = rb?.resource_bundle_items || []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const item of items) {
            if (item?.resource_id) {
              result.resourceBundleItemIds.add(Number(item.resource_id))
            }
          }
        }
      }
    }

    // Process enrollments: courses, resources, and bundle fallbacks
    if (enrollmentRes.data && enrollmentRes.data.length > 0) {
      for (const enr of enrollmentRes.data) {
        const isApproved = enr.payment_status === 'paid' || enr.payment_status === 'free' || enr.status === 'paid' || enr.status === 'free'
        const isPending = enr.payment_status === 'pending' || enr.status === 'pending'
        const rawItemId = enr.item_id

        if (enr.item_type === 'course' || (!enr.item_type && rawItemId)) {
          if (rawItemId) {
            const cleanCourseId = String(rawItemId).replace(/^course_/, '')
            if (isApproved) {
              result.enrolledCourseIds.add(cleanCourseId)
              result.enrolledCourseIds.add(String(rawItemId))
            } else if (isPending) {
              result.pendingCourseIds.add(cleanCourseId)
              result.pendingCourseIds.add(String(rawItemId))
            }
          }
        } else if (enr.item_type === 'resource') {
          if (rawItemId) {
            const cleanResId = Number(String(rawItemId).replace(/^resource_/, ''))
            if (!isNaN(cleanResId)) {
              if (isApproved) {
                result.enrolledResourceIds.add(cleanResId)
              } else if (isPending) {
                result.pendingResourceIds.add(cleanResId)
              }
            }
          }
        } else if (enr.item_type === 'subject_bundle' && isApproved) {
          const bundleId = rawItemId?.split(':')[0]
          if (bundleId) {
            const { data: bRow } = await supabase
              .from('subject_bundles')
              .select('subject_id')
              .eq('id', bundleId)
              .maybeSingle()
            if (bRow?.subject_id) {
              result.subjectBundleSubjectIds.add(Number(bRow.subject_id))
            }
          }
        } else if (enr.item_type === 'resource_bundle' && isApproved) {
          const bundleId = rawItemId?.split(':')[0]
          if (bundleId) {
            const { data: rbRow } = await supabase
              .from('resource_bundles')
              .select('subject_id, resource_bundle_items(resource_id)')
              .eq('id', bundleId)
              .maybeSingle()
            if (rbRow?.subject_id) {
              result.resourceBundleSubjectIds.add(Number(rbRow.subject_id))
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const items = (rbRow as any)?.resource_bundle_items || []
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const item of items) {
              if (item?.resource_id) {
                result.resourceBundleItemIds.add(Number(item.resource_id))
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[bundleAuthorizationService] Error fetching entitlements:', err)
  }

  return result
}

/**
 * Can user watch video?
 * YES if:
 * 1. user is admin or all-access premium member
 * 2. video is free/public preview
 * 3. user has valid Subject Bundle for that subject
 * 4. user has valid individual course enrollment
 * 5. course is free and not marked bundle-only
 * NOTE: Resource Bundle alone NEVER unlocks videos.
 */
export function canWatchVideo(options: {
  isFreePreview?: boolean
  courseId?: string
  subjectId?: number
  isBundleOnly?: boolean
  isFreeCourse?: boolean
  userSubjectBundles?: Set<number>
  userEnrolledCourseIds?: Set<string>
  isAdmin?: boolean
  isPremiumUser?: boolean
}): boolean {
  const {
    isFreePreview,
    courseId,
    subjectId,
    isBundleOnly,
    isFreeCourse,
    userSubjectBundles,
    userEnrolledCourseIds,
    isAdmin,
    isPremiumUser,
  } = options

  if (isAdmin || isPremiumUser) return true
  if (isFreePreview) return true

  // Individual course enrollment grants access
  if (courseId && userEnrolledCourseIds && userEnrolledCourseIds.has(courseId)) return true

  // Subject Bundle ONLY unlocks bundle-only courses of that subject!
  // Standalone individual courses require individual enrollment.
  if (isBundleOnly && subjectId && userSubjectBundles && userSubjectBundles.has(subjectId)) return true

  // If bundle-only, free enrollment without bundle is not permitted
  if (isBundleOnly) return false
  if (isFreeCourse) return true

  return false
}

/**
 * Can user access / download resource?
 * YES if:
 * 1. user is admin or premium all-access member
 * 2. user has valid individual enrollment for this resource
 * 3. user has valid Resource Bundle containing that resource
 * 4. user has valid Subject Bundle AND resource is marked bundle-only
 * 5. resource is free / not premium (and not marked bundle-only)
 */
export function canAccessResource(options: {
  isPremium?: boolean
  price?: number | null
  resourceId?: number
  subjectId?: number
  isBundleOnly?: boolean
  userSubjectBundles?: Set<number>
  userResourceBundleItemIds?: Set<number>
  userEnrolledResourceIds?: Set<number>
  isAdmin?: boolean
  isPremiumUser?: boolean
}): boolean {
  const {
    isPremium,
    price,
    resourceId,
    subjectId,
    isBundleOnly,
    userSubjectBundles,
    userResourceBundleItemIds,
    userEnrolledResourceIds,
    isAdmin,
    isPremiumUser,
  } = options

  if (isAdmin || isPremiumUser) return true

  // Individual resource enrollment grants access
  if (resourceId && userEnrolledResourceIds && userEnrolledResourceIds.has(resourceId)) return true

  // Resource bundle item grants access
  if (resourceId && userResourceBundleItemIds && userResourceBundleItemIds.has(resourceId)) return true

  // Subject Bundle ONLY unlocks bundle-only resources of that subject!
  // Standalone individual resources (isBundleOnly = false) require individual purchase!
  if (isBundleOnly && subjectId && userSubjectBundles && userSubjectBundles.has(subjectId)) return true

  // If resource is in a bundle and not unlocked by bundle, deny access
  if (isBundleOnly) return false

  // If individual paid resource and not enrolled
  if (isPremium && (price === undefined || price === null || price > 0)) return false

  return true
}


