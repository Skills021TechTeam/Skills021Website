// ============================================================================
// Skills021 — Resource Bundle Service
// Client service for Resource Bundles (Notes/PDFs only, no videos).
// ============================================================================
import { supabase } from './supabase'
import type {
  ResourceBundle,
  ResourceBundleItem,
  ResourceBundlePurchase,
  CreateResourceBundleInput,
  UpdateResourceBundleInput,
  ResourceBundleAccess,
  ResourceBundlePlan,
} from './resourceBundleTypes'

const RESOURCE_BUNDLE_SELECT = `
  id,
  subject_id,
  title,
  description,
  six_month_price,
  lifetime_price,
  six_month_enabled,
  lifetime_enabled,
  is_active,
  created_by,
  created_at,
  updated_at,
  subjects (
    id,
    name,
    code,
    semesters (
      id,
      semester_number,
      branches (
        id,
        name,
        code,
        courses (
          id,
          name,
          colleges (
            id,
            name
          )
        )
      )
    )
  )
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToResourceBundle(row: any): ResourceBundle {
  const subj = row.subjects
  const sem = subj?.semesters
  const br = sem?.branches
  const crs = br?.courses
  const clg = crs?.colleges

  return {
    id: String(row.id),
    subjectId: Number(row.subject_id),
    title: row.title ?? '',
    description: row.description ?? '',
    sixMonthPrice: Number(row.six_month_price ?? 0),
    lifetimePrice: Number(row.lifetime_price ?? 0),
    sixMonthEnabled: Boolean(row.six_month_enabled ?? true),
    lifetimeEnabled: Boolean(row.lifetime_enabled ?? true),
    isActive: Boolean(row.is_active ?? true),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',

    subjectName: subj?.name ?? undefined,
    subjectCode: subj?.code ?? undefined,
    semesterNumber: sem?.semester_number ?? undefined,
    branchName: br?.name ?? undefined,
    courseName: crs?.name ?? undefined,
    collegeName: clg?.name ?? undefined,
  }
}

// ─── Fetch Active Resource Bundle for a Subject (Public) ──────────────────────
export async function fetchResourceBundleBySubject(subjectId: number): Promise<ResourceBundle | null> {
  const { data, error } = await supabase
    .from('resource_bundles')
    .select(RESOURCE_BUNDLE_SELECT)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.warn(`[resourceBundleService] Failed to fetch resource bundle for subject ${subjectId}:`, error.message)
    return null
  }

  if (!data) return null
  const bundle = mapRowToResourceBundle(data)

  // Fetch mapped items
  bundle.items = await fetchResourceBundleItems(bundle.id)
  bundle.itemCount = bundle.items.length
  return bundle
}

// ─── Fetch Published Resource Bundles (Public) ──────────────────────────────
export async function fetchPublishedResourceBundles(): Promise<ResourceBundle[]> {
  const { data, error } = await supabase
    .from('resource_bundles')
    .select(RESOURCE_BUNDLE_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[resourceBundleService] Failed to fetch published resource bundles:', error.message)
    return []
  }

  const bundles = (data || []).map(mapRowToResourceBundle)

  // Fetch items counts
  try {
    const { data: itemCounts } = await supabase
      .from('resource_bundle_items')
      .select('bundle_id, resource_id')

    if (itemCounts) {
      const counts = new Map<string, number>()
      for (const row of itemCounts) {
        counts.set(row.bundle_id, (counts.get(row.bundle_id) || 0) + 1)
      }
      for (const b of bundles) {
        b.itemCount = counts.get(b.id) || 0
      }
    }
  } catch (err) {
    console.warn('[resourceBundleService] Could not aggregate item counts:', err)
  }

  return bundles
}

// ─── Auto-ensure Resource Bundle for a Subject ─────────────────────────────
export async function ensureResourceBundleForSubject(subjectId: number): Promise<ResourceBundle | null> {
  const existing = await fetchResourceBundleBySubject(subjectId)
  if (existing) return existing

  try {
    const { data: subj } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .maybeSingle()

    const title = subj?.name ? `${subj.name} Notes & Materials` : `Subject #${subjectId} Notes & Materials`
    return await createResourceBundle({
      subjectId,
      title,
      description: 'Handwritten chapter notes, formula sheets, previous year question papers, and study PDFs.',
      sixMonthPrice: 299,
      lifetimePrice: 599,
      sixMonthEnabled: true,
      lifetimeEnabled: true,
      isActive: true,
    })
  } catch (err) {
    console.warn('[ensureResourceBundleForSubject] Could not auto-create resource bundle:', err)
    return null
  }
}

// ─── Fetch Mapped Items for a Resource Bundle ────────────────────────────────
export async function fetchResourceBundleItems(bundleId: string): Promise<ResourceBundleItem[]> {
  const { data, error } = await supabase
    .from('resource_bundle_items')
    .select(`
      id,
      bundle_id,
      resource_id,
      sort_order,
      created_at,
      resources (
        id,
        title,
        description,
        file_url,
        thumbnail_url,
        author,
        is_premium,
        price,
        downloads,
        resource_types ( name )
      )
    `)
    .eq('bundle_id', bundleId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn(`[resourceBundleService] Failed to fetch items for bundle ${bundleId}:`, error.message)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: String(row.id),
    bundleId: String(row.bundle_id),
    resourceId: Number(row.resource_id),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at ?? '',
    title: row.resources?.title ?? '',
    description: row.resources?.description ?? '',
    fileUrl: row.resources?.file_url ?? '',
    thumbnailUrl: row.resources?.thumbnail_url ?? '',
    author: row.resources?.author ?? '',
    typeName: row.resources?.resource_types?.name ?? '',
    isPremium: Boolean(row.resources?.is_premium),
    downloads: Number(row.resources?.downloads ?? 0),
    price: row.resources?.price ? Number(row.resources?.price) : undefined,
  }))
}

// ─── Fetch All Resource Bundles (Admin) ───────────────────────────────────────
export async function fetchAllResourceBundles(): Promise<ResourceBundle[]> {
  const { data, error } = await supabase
    .from('resource_bundles')
    .select(RESOURCE_BUNDLE_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch resource bundles: ${error.message}`)
  }

  const bundles = (data || []).map(mapRowToResourceBundle)

  // Fetch items count & stats
  try {
    const { data: purchases } = await supabase
      .from('resource_bundle_purchases')
      .select('bundle_id, final_amount, status, payment_status')
      .eq('payment_status', 'paid')

    if (purchases) {
      const statsMap = new Map<string, { total: number; active: number; revenue: number }>()
      for (const p of purchases) {
        const bid = p.bundle_id
        const curr = statsMap.get(bid) || { total: 0, active: 0, revenue: 0 }
        curr.total += 1
        if (p.status === 'active') curr.active += 1
        curr.revenue += Number(p.final_amount ?? 0)
        statsMap.set(bid, curr)
      }
      for (const b of bundles) {
        const s = statsMap.get(b.id)
        b.totalPurchasers = s?.total ?? 0
        b.activePurchasers = s?.active ?? 0
        b.revenue = s?.revenue ?? 0
      }
    }
  } catch (err) {
    console.warn('[resourceBundleService] Could not aggregate purchase stats:', err)
  }

  return bundles
}

// ─── Create Resource Bundle (Admin) ──────────────────────────────────────────
export async function createResourceBundle(input: CreateResourceBundleInput): Promise<ResourceBundle> {
  if (input.sixMonthPrice < 0 || input.lifetimePrice < 0) {
    throw new Error('Prices cannot be negative')
  }
  if (!input.sixMonthEnabled && !input.lifetimeEnabled) {
    throw new Error('At least one plan (6-Month or Lifetime) must be enabled')
  }

  const { data, error } = await supabase
    .from('resource_bundles')
    .insert({
      subject_id: input.subjectId,
      title: input.title,
      description: input.description || '',
      six_month_price: input.sixMonthPrice,
      lifetime_price: input.lifetimePrice,
      six_month_enabled: input.sixMonthEnabled ?? true,
      lifetime_enabled: input.lifetimeEnabled ?? true,
      is_active: input.isActive ?? true,
    })
    .select(RESOURCE_BUNDLE_SELECT)
    .single()

  if (error) {
    throw new Error(`Failed to create resource bundle: ${error.message}`)
  }

  const bundle = mapRowToResourceBundle(data)

  // Map resources if provided
  if (input.resourceIds && input.resourceIds.length > 0) {
    await updateResourceBundleMappings(bundle.id, input.resourceIds)
  }

  return bundle
}

// ─── Update Resource Bundle (Admin) ──────────────────────────────────────────
export async function updateResourceBundle(
  id: string,
  input: UpdateResourceBundleInput
): Promise<ResourceBundle> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.sixMonthPrice !== undefined) updates.six_month_price = input.sixMonthPrice
  if (input.lifetimePrice !== undefined) updates.lifetime_price = input.lifetimePrice
  if (input.sixMonthEnabled !== undefined) updates.six_month_enabled = input.sixMonthEnabled
  if (input.lifetimeEnabled !== undefined) updates.lifetime_enabled = input.lifetimeEnabled
  if (input.isActive !== undefined) updates.is_active = input.isActive

  const { data, error } = await supabase
    .from('resource_bundles')
    .update(updates)
    .eq('id', id)
    .select(RESOURCE_BUNDLE_SELECT)
    .single()

  if (error) {
    throw new Error(`Failed to update resource bundle: ${error.message}`)
  }

  const bundle = mapRowToResourceBundle(data)

  if (input.resourceIds !== undefined) {
    await updateResourceBundleMappings(id, input.resourceIds)
  }

  return bundle
}

// ─── Update Resource Mappings for Bundle (Admin) ──────────────────────────────
export async function updateResourceBundleMappings(bundleId: string, resourceIds: number[]): Promise<void> {
  // Delete existing mappings
  await supabase.from('resource_bundle_items').delete().eq('bundle_id', bundleId)

  if (resourceIds.length === 0) return

  const rows = resourceIds.map((resId, idx) => ({
    bundle_id: bundleId,
    resource_id: resId,
    sort_order: idx + 1,
  }))

  const { error } = await supabase.from('resource_bundle_items').insert(rows)
  if (error) {
    throw new Error(`Failed to map resources to bundle: ${error.message}`)
  }
}

// ─── Delete Resource Bundle (Admin) ──────────────────────────────────────────
export async function deleteResourceBundle(id: string): Promise<void> {
  // Check if there are active purchases
  const { count } = await supabase
    .from('resource_bundle_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('bundle_id', id)
    .eq('payment_status', 'paid')

  if (count && count > 0) {
    throw new Error(`Cannot delete this bundle because ${count} student(s) have purchased it. You can deactivate it instead.`)
  }

  const { error } = await supabase.from('resource_bundles').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete resource bundle: ${error.message}`)
}

// ─── Toggle Bundle Active State (Admin) ───────────────────────────────────────
export async function toggleResourceBundleActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('resource_bundles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Failed to update bundle status: ${error.message}`)
}

// ─── Get User Resource Bundle Entitlement (Authoritative RPC) ────────────────
export async function getUserResourceBundleEntitlement(
  userId: string,
  subjectId: number
): Promise<ResourceBundleAccess> {
  let resAccess: ResourceBundleAccess = { hasAccess: false }

  try {
    const { data, error } = await supabase.rpc('get_user_resource_bundle_entitlement', {
      p_user_id: userId,
      p_subject_id: subjectId,
    })

    if (!error && data) {
      const isPend = Boolean(data?.is_pending || data?.has_pending)
      resAccess = {
        hasAccess: Boolean(data?.has_access),
        planType: (data?.plan_type as ResourceBundlePlan) || undefined,
        startsAt: data?.starts_at || null,
        expiresAt: data?.expires_at || null,
        isLifetime: Boolean(data?.is_lifetime),
        isPending: isPend,
        hasPending: isPend,
        purchaseId: data?.purchase_id || undefined,
        bundleId: data?.bundle_id || undefined,
      }
    }
  } catch (err) {
    console.warn('[resourceBundleService] RPC get_user_resource_bundle_entitlement failed:', err)
  }

  // Authoritative check on enrollments table
  try {
    const { data: enrRows } = await supabase
      .from('enrollments')
      .select('id, payment_status, status, item_id, item_title')
      .eq('user_id', userId)
      .eq('item_type', 'resource_bundle')
      .order('created_at', { ascending: false })

    if (enrRows && enrRows.length > 0) {
      const rb = await fetchResourceBundleBySubject(subjectId).catch(() => null)
      const matching = enrRows.find(e =>
        (rb?.id && e.item_id?.includes(rb.id)) ||
        e.item_id?.includes(String(subjectId)) ||
        (rb?.subjectName && e.item_title?.toLowerCase().includes(rb.subjectName.toLowerCase()))
      )

      if (matching) {
        if (matching.payment_status === 'paid') {
          resAccess.hasAccess = true
          resAccess.isPending = false
          resAccess.hasPending = false
          resAccess.planType = (matching.item_id?.includes('lifetime') ? 'lifetime' : 'six_month') as ResourceBundlePlan

          // Auto-heal resource_bundle_purchases
          Promise.resolve(
            supabase
              .from('resource_bundle_purchases')
              .update({
                payment_status: 'paid',
                status: 'active',
                approved_at: new Date().toISOString(),
                starts_at: new Date().toISOString(),
              })
              .eq('enrollment_id', matching.id)
          ).catch(() => {})
        } else if (matching.payment_status === 'pending' && !resAccess.hasAccess) {
          resAccess.isPending = true
          resAccess.hasPending = true
        }
      }
    }
  } catch (enrErr) {
    console.warn('[resourceBundleService] Error checking enrollments fallback:', enrErr)
  }

  // If still no access, check if user has access via Subject Bundle or Semester Bundle
  if (!resAccess.hasAccess) {
    try {
      const { hasSubjectBundleAccess } = await import('./subjectBundleService')
      const hasAccess = await hasSubjectBundleAccess(userId, subjectId)
      if (hasAccess) {
        resAccess.hasAccess = true
        resAccess.isPending = false
        resAccess.hasPending = false
      }
    } catch {}
  }

  return resAccess
}

// ─── Authoritative Check: Can User Access Specific Resource? ─────────────────
export async function hasResourceAccess(
  userId: string | null,
  resourceId: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_resource_access', {
      p_user_id: userId || null,
      p_resource_id: resourceId,
    })
    if (error) {
      console.warn('[resourceBundleService] RPC has_resource_access failed:', error.message)
      return false
    }
    return Boolean(data)
  } catch {
    return false
  }
}

// ─── Submit Resource Bundle Payment Proof ────────────────────────────────────
export interface SubmitResourceBundlePaymentInput {
  bundleId: string
  subjectId: number
  planType: ResourceBundlePlan
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  utrNumber: string
  screenshotUrl: string
  originalAmount: number
  productDiscountAmount: number
  couponCode?: string | null
  couponDiscountAmount: number
  finalAmount: number
  discountId?: string | null
  couponId?: string | null
}

export async function submitResourceBundlePaymentProof(
  input: SubmitResourceBundlePaymentInput
): Promise<{ enrollmentId: string }> {
  // 1. Create enrollment row in public.enrollments with item_type = 'resource_bundle'
  const itemId = `${input.bundleId}:${input.planType}`
  const itemTitle = `Resource Bundle (${input.planType === 'lifetime' ? 'Lifetime' : '6 Months'})`

  const { data: enrollment, error: enrError } = await supabase
    .from('enrollments')
    .insert({
      user_id: input.userId,
      item_type: 'resource_bundle',
      item_id: itemId,
      item_title: itemTitle,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      amount: input.finalAmount,
      original_amount: input.originalAmount,
      product_discount_amount: input.productDiscountAmount,
      coupon_code: input.couponCode || null,
      coupon_discount_amount: input.couponDiscountAmount,
      applied_discount_id: input.discountId || null,
      applied_coupon_id: input.couponId || null,
      payment_status: 'pending',
      utr_number: input.utrNumber,
      screenshot_url: input.screenshotUrl,
    })
    .select('id')
    .single()

  if (enrError) {
    if (enrError.message?.includes('enrollments_item_type_check')) {
      throw new Error(
        'Database update required: Please run "20260905_fix_enrollments_item_type_check.sql" in Supabase SQL editor to allow resource_bundle.'
      )
    }
    throw new Error(`Failed to submit payment proof: ${enrError.message}`)
  }

  // 2. Create pending purchase row in public.resource_bundle_purchases
  const { error: purchaseError } = await supabase
    .from('resource_bundle_purchases')
    .insert({
      user_id: input.userId,
      bundle_id: input.bundleId,
      subject_id: input.subjectId,
      enrollment_id: enrollment.id,
      plan_type: input.planType,
      original_amount: input.originalAmount,
      product_discount_amount: input.productDiscountAmount,
      coupon_code: input.couponCode || null,
      coupon_discount_amount: input.couponDiscountAmount,
      final_amount: input.finalAmount,
      payment_status: 'pending',
      status: 'pending',
    })

  if (purchaseError) {
    console.warn('[resourceBundleService] Created enrollment but pending purchase record failed:', purchaseError.message)
  }

  return { enrollmentId: enrollment.id }
}
