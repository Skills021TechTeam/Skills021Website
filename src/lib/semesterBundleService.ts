// ============================================================================
// Skills021 — Semester Bundle Service
// Complete service layer for Semester Bundle pricing, entitlement access control,
// mapping to Subject Bundles, and manual UPI approval integration.
// ============================================================================

import { supabase } from './supabase'
import type {
  SemesterBundle,
  SemesterBundleSubject,
  CreateSemesterBundleInput,
  UpdateSemesterBundleInput,
  SemesterBundleSubjectMappingInput,
  SemesterBundleAccess,
  SemesterBundlePlan,
  SubmitSemesterBundlePaymentInput,
} from './semesterBundleTypes'
import { extractYouTubeThumbnail } from './subjectBundleService'

const SEMESTER_BUNDLE_SELECT = `
  id,
  semester_id,
  title,
  description,
  thumbnail_url,
  six_month_price,
  lifetime_price,
  six_month_enabled,
  lifetime_enabled,
  is_active,
  created_by,
  created_at,
  updated_at,
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
  ),
  semester_bundle_subjects (
    id,
    bundle_id,
    subject_bundle_id,
    sort_order,
    is_semester_only,
    created_at,
    subject_bundles (
      id,
      subject_id,
      six_month_price,
      lifetime_price,
      thumbnail_url,
      description,
      is_semester_only,
      subjects (
        id,
        name,
        code
      )
    )
  )
`

const SEMESTER_BUNDLE_SELECT_BASE = `
  id,
  semester_id,
  title,
  description,
  thumbnail_url,
  six_month_price,
  lifetime_price,
  six_month_enabled,
  lifetime_enabled,
  is_active,
  created_by,
  created_at,
  updated_at,
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
  ),
  semester_bundle_subjects (
    id,
    bundle_id,
    subject_bundle_id,
    sort_order,
    created_at,
    subject_bundles (
      id,
      subject_id,
      six_month_price,
      lifetime_price,
      thumbnail_url,
      description,
      subjects (
        id,
        name,
        code
      )
    )
  )
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToSemesterBundle(row: any): SemesterBundle {
  const sem = row.semesters
  const br = sem?.branches
  const crs = br?.courses
  const clg = crs?.colleges

  const rawSubjects = row.semester_bundle_subjects || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects: SemesterBundleSubject[] = rawSubjects.map((sbs: any) => {
    const sb = sbs.subject_bundles
    const subj = sb?.subjects
    return {
      id: String(sbs.id),
      bundleId: String(sbs.bundle_id),
      subjectBundleId: String(sbs.subject_bundle_id),
      sortOrder: Number(sbs.sort_order ?? 0),
      isSemesterOnly: Boolean(sbs.is_semester_only ?? sb?.is_semester_only ?? false),
      createdAt: sbs.created_at,
      subjectId: subj ? Number(subj.id) : (sb?.subject_id ? Number(sb.subject_id) : undefined),
      subjectName: subj?.name,
      subjectCode: subj?.code,
      sixMonthPrice: sb?.six_month_price != null ? Number(sb.six_month_price) : undefined,
      lifetimePrice: sb?.lifetime_price != null ? Number(sb.lifetime_price) : undefined,
      thumbnailUrl: sb?.thumbnail_url || undefined,
    }
  })

  return {
    id: String(row.id),
    semesterId: Number(row.semester_id),
    title: row.title,
    description: row.description || '',
    thumbnailUrl: row.thumbnail_url || undefined,
    sixMonthPrice: Number(row.six_month_price ?? 0),
    lifetimePrice: Number(row.lifetime_price ?? 0),
    sixMonthEnabled: Boolean(row.six_month_enabled),
    lifetimeEnabled: Boolean(row.lifetime_enabled),
    isActive: Boolean(row.is_active),
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    semesterNumber: sem?.semester_number != null ? Number(sem.semester_number) : undefined,
    branchId: br?.id ? Number(br.id) : undefined,
    branchName: br?.name || undefined,
    branchCode: br?.code || undefined,
    academicCourseId: crs?.id ? Number(crs.id) : undefined,
    academicCourseName: crs?.name || undefined,
    collegeId: clg?.id ? Number(clg.id) : undefined,
    collegeName: clg?.name || undefined,

    subjects,
    subjectCount: subjects.length,
    totalVideos: 0,
    totalResources: 0,
    rating: 4.9,
    reviews: 80,
  }
}

// ─── Fetch Published Semester Bundles (Student Page) ─────────────────────────
export async function fetchPublishedSemesterBundles(): Promise<SemesterBundle[]> {
  let data: any = null
  let error: any = null

  const primaryRes = await supabase
    .from('semester_bundles')
    .select(SEMESTER_BUNDLE_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  data = primaryRes.data
  error = primaryRes.error

  if (error && (error.code === '42703' || error.message?.includes('is_semester_only') || error.code === 'PGRST204')) {
    const fallback = await supabase
      .from('semester_bundles')
      .select(SEMESTER_BUNDLE_SELECT_BASE)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('[semesterBundleService] Failed to fetch published semester bundles:', error.message)
    return []
  }

  const bundles: SemesterBundle[] = (data ?? []).map(mapRowToSemesterBundle)

  // Aggregate video & note counts for mapped subjects
  try {
    const allSubjectIds = new Set<number>()
    bundles.forEach((b) => {
      b.subjects?.forEach((s) => {
        if (s.subjectId) allSubjectIds.add(s.subjectId)
      })
    })

    const subjectIdArr = Array.from(allSubjectIds)
    if (subjectIdArr.length > 0) {
      const [vidsRes, resRes] = await Promise.all([
        supabase.from('subject_videos').select('subject_id, video_url, thumbnail_url').in('subject_id', subjectIdArr),
        supabase.from('resources').select('subject_id, is_bundle_only').in('subject_id', subjectIdArr).eq('status', 'Published'),
      ])

      const videoCounts = new Map<number, number>()
      const fallbackThumbs = new Map<number, string>()
      for (const row of vidsRes.data || []) {
        const sid = Number(row.subject_id)
        videoCounts.set(sid, (videoCounts.get(sid) || 0) + 1)
        if (!fallbackThumbs.has(sid)) {
          const t = (row as any).thumbnail_url || extractYouTubeThumbnail(row.video_url)
          if (t) fallbackThumbs.set(sid, t)
        }
      }

      const resourceCounts = new Map<number, number>()
      for (const row of resRes.data || []) {
        if (!row.is_bundle_only) continue
        const sid = Number(row.subject_id)
        resourceCounts.set(sid, (resourceCounts.get(sid) || 0) + 1)
      }

      for (const b of bundles) {
        let totalVids = 0
        let totalRes = 0
        let candidateThumb: string | undefined = b.thumbnailUrl

        b.subjects?.forEach((s) => {
          if (s.subjectId) {
            const vCount = videoCounts.get(s.subjectId) || 0
            const rCount = resourceCounts.get(s.subjectId) || 0
            s.videoCount = vCount
            s.resourceCount = rCount
            totalVids += vCount
            totalRes += rCount
            if (!candidateThumb) {
              candidateThumb = s.thumbnailUrl || fallbackThumbs.get(s.subjectId)
            }
          }
        })

        b.totalVideos = totalVids
        b.totalResources = totalRes
        if (!b.thumbnailUrl && candidateThumb) {
          b.thumbnailUrl = candidateThumb
        }
      }
    }
  } catch (err) {
    console.warn('[semesterBundleService] Could not aggregate video/resource counts:', err)
  }

  return bundles
}

// ─── Fetch Single Semester Bundle by ID or Semester ID ───────────────────────
export async function fetchSemesterBundle(idOrSemesterId: string | number): Promise<SemesterBundle | null> {
  const isUuid = typeof idOrSemesterId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSemesterId)
  let query = supabase.from('semester_bundles').select(SEMESTER_BUNDLE_SELECT)

  if (isUuid) {
    query = query.eq('id', idOrSemesterId)
  } else {
    query = query.eq('semester_id', Number(idOrSemesterId))
  }

  let data: any = null
  let error: any = null

  const primaryRes = await query.maybeSingle()
  data = primaryRes.data
  error = primaryRes.error

  if (error && (error.code === '42703' || error.message?.includes('is_semester_only') || error.code === 'PGRST204')) {
    let fallbackQuery = supabase.from('semester_bundles').select(SEMESTER_BUNDLE_SELECT_BASE)
    if (isUuid) {
      fallbackQuery = fallbackQuery.eq('id', idOrSemesterId)
    } else {
      fallbackQuery = fallbackQuery.eq('semester_id', Number(idOrSemesterId))
    }
    const fb = await fallbackQuery.maybeSingle()
    data = fb.data
    error = fb.error
  }

  if (error || !data) {
    if (error) console.error('[semesterBundleService] Error fetching semester bundle:', error.message)
    return null
  }

  const bundle = mapRowToSemesterBundle(data)

  // Aggregate curriculum counts for the mapped subjects
  try {
    const subjectIds = (bundle.subjects || []).map(s => s.subjectId).filter(Boolean) as number[]
    if (subjectIds.length > 0) {
      const [vidsRes, resRes, unitsRes] = await Promise.all([
        supabase.from('subject_videos').select('subject_id, thumbnail_url, video_url').in('subject_id', subjectIds),
        supabase.from('resources').select('subject_id, is_bundle_only').in('subject_id', subjectIds).eq('status', 'Published'),
        supabase.from('subject_units').select('subject_id').in('subject_id', subjectIds),
      ])

      const videoCounts = new Map<number, number>()
      for (const row of vidsRes.data || []) {
        const sid = Number(row.subject_id)
        videoCounts.set(sid, (videoCounts.get(sid) || 0) + 1)
      }

      const resCounts = new Map<number, number>()
      for (const row of resRes.data || []) {
        if (!row.is_bundle_only) continue
        const sid = Number(row.subject_id)
        resCounts.set(sid, (resCounts.get(sid) || 0) + 1)
      }

      const unitCounts = new Map<number, number>()
      for (const row of unitsRes.data || []) {
        const sid = Number(row.subject_id)
        unitCounts.set(sid, (unitCounts.get(sid) || 0) + 1)
      }

      let totalVids = 0
      let totalRes = 0
      bundle.subjects?.forEach((s) => {
        if (s.subjectId) {
          s.videoCount = videoCounts.get(s.subjectId) || 0
          s.resourceCount = resCounts.get(s.subjectId) || 0
          s.unitCount = unitCounts.get(s.subjectId) || 0
          totalVids += s.videoCount
          totalRes += s.resourceCount
        }
      })
      bundle.totalVideos = totalVids
      bundle.totalResources = totalRes
    }
  } catch (err) {
    console.warn('[semesterBundleService] Error enriching single semester bundle:', err)
  }

  return bundle
}

// ─── Fetch Published Semester Bundle for a Subject (Upsell banner) ───────────
export async function fetchSemesterBundleForSubject(subjectId: number): Promise<SemesterBundle | null> {
  try {
    const { data: sbRow, error: sbErr } = await supabase
      .from('subject_bundles')
      .select('id')
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (sbErr || !sbRow?.id) return null

    const { data: mapping, error: mapErr } = await supabase
      .from('semester_bundle_subjects')
      .select('bundle_id, semester_bundles!inner(is_active)')
      .eq('subject_bundle_id', sbRow.id)
      .eq('semester_bundles.is_active', true)
      .limit(1)
      .maybeSingle()

    if (mapErr || !mapping?.bundle_id) return null
    return fetchSemesterBundle(mapping.bundle_id)
  } catch (err) {
    console.warn('[semesterBundleService] Error checking semester bundle for subject:', err)
    return null
  }
}


// ─── Fetch All Semester Bundles (Admin Dashboard) ───────────────────────────
export async function fetchAllSemesterBundles(): Promise<SemesterBundle[]> {
  let data: any = null
  let error: any = null

  const primaryRes = await supabase
    .from('semester_bundles')
    .select(SEMESTER_BUNDLE_SELECT)
    .order('created_at', { ascending: false })

  data = primaryRes.data
  error = primaryRes.error

  if (error && (error.code === '42703' || error.message?.includes('is_semester_only') || error.code === 'PGRST204')) {
    const fallback = await supabase
      .from('semester_bundles')
      .select(SEMESTER_BUNDLE_SELECT_BASE)
      .order('created_at', { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('[semesterBundleService] Failed to fetch all semester bundles:', error.message)
    throw new Error(`Failed to load semester bundles: ${error.message}`)
  }

  const bundles: SemesterBundle[] = (data ?? []).map(mapRowToSemesterBundle)

  // Aggregate purchase counts and revenue from semester_bundle_purchases
  try {
    const { data: purchases } = await supabase
      .from('semester_bundle_purchases')
      .select('bundle_id, payment_status, final_amount, status, expires_at')

    if (purchases && purchases.length > 0) {
      const now = new Date().toISOString()
      const statsMap = new Map<string, { total: number; active: number; revenue: number }>()

      purchases.forEach((p) => {
        const bId = String(p.bundle_id)
        const current = statsMap.get(bId) || { total: 0, active: 0, revenue: 0 }
        current.total += 1
        if (p.payment_status === 'paid') {
          current.revenue += Number(p.final_amount ?? 0)
          const isNotExpired = !p.expires_at || p.expires_at > now
          if (p.status === 'active' && isNotExpired) {
            current.active += 1
          }
        }
        statsMap.set(bId, current)
      })

      bundles.forEach((b) => {
        const s = statsMap.get(b.id)
        if (s) {
          b.totalPurchases = s.total
          b.activePurchases = s.active
          b.totalRevenue = s.revenue
        } else {
          b.totalPurchases = 0
          b.activePurchases = 0
          b.totalRevenue = 0
        }
      })
    }
  } catch (err) {
    console.warn('[semesterBundleService] Could not aggregate semester bundle purchases:', err)
  }

  return bundles
}

// ─── Create Semester Bundle (Admin) ──────────────────────────────────────────
export async function createSemesterBundle(input: CreateSemesterBundleInput): Promise<SemesterBundle> {
  if (input.sixMonthPrice < 0 || input.lifetimePrice < 0) {
    throw new Error('Prices cannot be negative')
  }
  if (!input.sixMonthEnabled && !input.lifetimeEnabled) {
    throw new Error('At least one plan (6-Month or Lifetime) must be enabled')
  }

  // 1. Insert bundle
  const insertPayload = {
    semester_id: input.semesterId,
    title: input.title.trim(),
    description: input.description?.trim() || '',
    thumbnail_url: input.thumbnailUrl || null,
    six_month_price: input.sixMonthPrice,
    lifetime_price: input.lifetimePrice,
    six_month_enabled: input.sixMonthEnabled ?? true,
    lifetime_enabled: input.lifetimeEnabled ?? true,
    is_active: input.isActive ?? true,
  }

  const { data, error } = await supabase
    .from('semester_bundles')
    .insert(insertPayload)
    .select(SEMESTER_BUNDLE_SELECT)
    .single()

  if (error) {
    throw new Error(`Failed to create semester bundle: ${error.message}`)
  }

  const createdBundle = mapRowToSemesterBundle(data)

  // 2. Map selected subject bundles if provided
  const mappingsToApply = input.subjectBundleMappings || input.subjectBundleIds
  if (mappingsToApply && mappingsToApply.length > 0) {
    await updateSemesterBundleMappings(createdBundle.id, mappingsToApply)
    return (await fetchSemesterBundle(createdBundle.id)) || createdBundle
  }

  return createdBundle
}

// ─── Update Semester Bundle (Admin) ──────────────────────────────────────────
export async function updateSemesterBundle(id: string, input: UpdateSemesterBundleInput): Promise<SemesterBundle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.description !== undefined) payload.description = input.description.trim()
  if (input.thumbnailUrl !== undefined) payload.thumbnail_url = input.thumbnailUrl || null
  if (input.sixMonthPrice !== undefined) {
    if (input.sixMonthPrice < 0) throw new Error('Price cannot be negative')
    payload.six_month_price = input.sixMonthPrice
  }
  if (input.lifetimePrice !== undefined) {
    if (input.lifetimePrice < 0) throw new Error('Price cannot be negative')
    payload.lifetime_price = input.lifetimePrice
  }
  if (input.sixMonthEnabled !== undefined) payload.six_month_enabled = input.sixMonthEnabled
  if (input.lifetimeEnabled !== undefined) payload.lifetime_enabled = input.lifetimeEnabled
  if (input.isActive !== undefined) payload.is_active = input.isActive

  const { error } = await supabase
    .from('semester_bundles')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(`Failed to update semester bundle: ${error.message}`)

  // Update mappings if provided
  const mappingsToApply = input.subjectBundleMappings !== undefined ? input.subjectBundleMappings : input.subjectBundleIds
  if (mappingsToApply !== undefined) {
    await updateSemesterBundleMappings(id, mappingsToApply)
  }

  const updated = await fetchSemesterBundle(id)
  if (!updated) throw new Error('Updated semester bundle could not be reloaded')
  return updated
}

// ─── Update Semester Bundle Mappings ─────────────────────────────────────────
export async function updateSemesterBundleMappings(
  bundleId: string,
  mappings: (string | SemesterBundleSubjectMappingInput)[]
): Promise<void> {
  // Fetch previous mappings to check for removed subject bundles
  const { data: prevMappings } = await supabase
    .from('semester_bundle_subjects')
    .select('subject_bundle_id')
    .eq('bundle_id', bundleId)

  const prevIds = (prevMappings || []).map(r => String(r.subject_bundle_id))

  // Remove existing mappings
  await supabase
    .from('semester_bundle_subjects')
    .delete()
    .eq('bundle_id', bundleId)

  const normalized = mappings.map((m, index) => {
    if (typeof m === 'string') {
      return {
        bundle_id: bundleId,
        subject_bundle_id: m,
        sort_order: index + 1,
        is_semester_only: false,
      }
    }
    return {
      bundle_id: bundleId,
      subject_bundle_id: m.subjectBundleId,
      sort_order: index + 1,
      is_semester_only: Boolean(m.isSemesterOnly),
    }
  })

  // Handle removed subject bundles: revert their is_semester_only to false
  const currentIds = new Set(normalized.map(n => n.subject_bundle_id))
  const removedIds = prevIds.filter(id => !currentIds.has(id))
  if (removedIds.length > 0) {
    try {
      await supabase
        .from('subject_bundles')
        .update({ is_semester_only: false })
        .in('id', removedIds)
    } catch (err) {
      console.warn('[updateSemesterBundleMappings] Revert removed subjects warning:', err)
    }
  }

  if (normalized.length === 0) return

  let { error } = await supabase
    .from('semester_bundle_subjects')
    .insert(normalized)

  if (error && (error.code === '42703' || error.message?.includes('is_semester_only') || error.code === 'PGRST204')) {
    const fallbackRows = normalized.map(({ is_semester_only, ...rest }) => rest)
    const fbRes = await supabase.from('semester_bundle_subjects').insert(fallbackRows)
    error = fbRes.error
  }

  if (error) {
    throw new Error(`Failed to update semester bundle subject mappings: ${error.message}`)
  }

  // Synchronize is_semester_only on subject_bundles table
  try {
    for (const item of normalized) {
      await supabase
        .from('subject_bundles')
        .update({ is_semester_only: item.is_semester_only })
        .eq('id', item.subject_bundle_id)
    }
  } catch (syncErr) {
    console.warn('[updateSemesterBundleMappings] Syncing is_semester_only on subject_bundles failed:', syncErr)
  }
}

// ─── Delete Semester Bundle (Admin) ──────────────────────────────────────────
export async function deleteSemesterBundle(id: string): Promise<void> {
  const { count } = await supabase
    .from('semester_bundle_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('bundle_id', id)
    .eq('payment_status', 'paid')

  if (count && count > 0) {
    throw new Error(`Cannot delete this semester bundle because ${count} student(s) have purchased it. Deactivate it instead.`)
  }

  const { error } = await supabase
    .from('semester_bundles')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete semester bundle: ${error.message}`)
}

// ─── Toggle Semester Bundle Active State ─────────────────────────────────────
export async function toggleSemesterBundleActive(id: string, isActive: boolean): Promise<SemesterBundle> {
  return updateSemesterBundle(id, { isActive })
}

// ─── Authoritative Entitlement & Access Check ──────────────────────────────
export async function hasSemesterBundleAccess(userId: string | null, semesterId: number): Promise<boolean> {
  if (!userId || !semesterId) return false

  try {
    const { data, error } = await supabase.rpc('has_semester_bundle_access', {
      p_user_id: userId,
      p_semester_id: semesterId,
    })

    if (!error && data !== null) {
      return Boolean(data)
    }
  } catch (err) {
    console.warn('[semesterBundleService] RPC error on has_semester_bundle_access:', err)
  }

  // Fallback check on semester_bundle_purchases
  try {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('semester_bundle_purchases')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('semester_id', semesterId)
      .eq('payment_status', 'paid')
      .eq('status', 'active')
      .limit(1)

    if (data && data.length > 0) {
      const p = data[0]
      if (!p.expires_at || p.expires_at > now) return true
    }
  } catch {}

  return false
}

export async function getUserSemesterBundleEntitlement(
  userId: string | null,
  bundleIdOrSemesterId: string | number
): Promise<SemesterBundleAccess> {
  if (!userId || !bundleIdOrSemesterId) return { hasAccess: false }

  const idStr = String(bundleIdOrSemesterId)
  let entitlement: SemesterBundleAccess = { hasAccess: false }

  try {
    const { data, error } = await supabase.rpc('get_user_semester_bundle_entitlement', {
      p_user_id: userId,
      p_bundle_id_str: idStr,
    })

    if (!error && data) {
      const res = data as Record<string, unknown>
      entitlement = {
        hasAccess: Boolean(res.has_access),
        isPending: Boolean(res.is_pending),
        hasPending: Boolean(res.is_pending),
        planType: (res.plan_type as SemesterBundlePlan) || undefined,
        startsAt: (res.starts_at as string) || null,
        expiresAt: (res.expires_at as string) || null,
        isLifetime: Boolean(res.is_lifetime),
        purchaseId: (res.purchase_id as string) || undefined,
        bundleId: (res.bundle_id as string) || undefined,
        semesterId: res.semester_id ? Number(res.semester_id) : undefined,
      }
    }
  } catch (err) {
    console.warn('[semesterBundleService] RPC get_user_semester_bundle_entitlement failed:', err)
  }

  // Fallback check on enrollments table
  try {
    const { data: enrRows } = await supabase
      .from('enrollments')
      .select('id, payment_status, status, item_id, item_title')
      .eq('user_id', userId)
      .eq('item_type', 'semester_bundle')
      .order('created_at', { ascending: false })

    if (enrRows && enrRows.length > 0) {
      const matching = enrRows.find(e => e.item_id?.includes(idStr))
      if (matching) {
        if (matching.payment_status === 'paid') {
          entitlement.hasAccess = true
          entitlement.isPending = false
          entitlement.hasPending = false
          entitlement.planType = matching.item_id?.includes('lifetime') ? 'lifetime' : 'six_month'
        } else if (matching.payment_status === 'pending' && !entitlement.hasAccess) {
          entitlement.isPending = true
          entitlement.hasPending = true
        }
      }
    }
  } catch {}

  return entitlement
}

// ─── Submit Manual UPI Payment Proof for Semester Bundle ─────────────────────
export async function submitSemesterBundlePaymentProof(
  input: SubmitSemesterBundlePaymentInput
): Promise<{ enrollmentId: string }> {
  const itemId = `${input.bundleId}:${input.planType}`
  const planLabel = input.planType === 'lifetime' ? 'Lifetime Access' : '6 Months Access'
  const title = `Semester Bundle: ${input.semesterTitle} (${planLabel})`

  // 1. Insert/Upsert into enrollments table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollmentPayload: Record<string, any> = {
    item_type: 'semester_bundle',
    item_id: itemId,
    item_title: title,
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

  if (input.originalAmount !== undefined) enrollmentPayload.original_amount = input.originalAmount
  if (input.productDiscountAmount !== undefined) enrollmentPayload.product_discount_amount = input.productDiscountAmount
  if (input.couponCode !== undefined) enrollmentPayload.coupon_code = input.couponCode
  if (input.couponDiscountAmount !== undefined) enrollmentPayload.coupon_discount_amount = input.couponDiscountAmount
  if (input.appliedDiscountId !== undefined) enrollmentPayload.applied_discount_id = input.appliedDiscountId
  if (input.appliedCouponId !== undefined) enrollmentPayload.applied_coupon_id = input.appliedCouponId

  const { data: enrData, error: enrError } = await supabase
    .from('enrollments')
    .upsert(enrollmentPayload, { onConflict: 'user_id,item_type,item_id' })
    .select('id')
    .single()

  if (enrError) {
    throw new Error(`Failed to create bundle enrollment: ${enrError.message}`)
  }

  const enrollmentId = enrData.id

  // 2. Insert pending record into semester_bundle_purchases
  const { error: purchaseError } = await supabase
    .from('semester_bundle_purchases')
    .insert({
      user_id: input.userId,
      bundle_id: input.bundleId,
      semester_id: input.semesterId,
      enrollment_id: enrollmentId,
      plan_type: input.planType,
      original_amount: input.originalAmount ?? input.amount,
      product_discount_amount: input.productDiscountAmount ?? 0,
      coupon_code: input.couponCode ?? null,
      coupon_discount_amount: input.couponDiscountAmount ?? 0,
      final_amount: input.amount,
      payment_status: 'pending',
      status: 'pending',
    })

  if (purchaseError) {
    console.warn('[semesterBundleService] Error inserting pending semester_bundle_purchases:', purchaseError.message)
  }

  return { enrollmentId }
}
