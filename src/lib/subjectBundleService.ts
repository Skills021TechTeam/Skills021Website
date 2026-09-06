// ============================================================================
// Skills021 — Subject Bundle Service
// Complete service layer for Subject Bundle pricing, access control,
// units & videos curriculum management, and manual UPI approval integration.
// ============================================================================

import { supabase } from './supabase'
import type {
  SubjectBundle,
  CreateSubjectBundleInput,
  UpdateSubjectBundleInput,
  SubjectUnit,
  CreateSubjectUnitInput,
  UpdateSubjectUnitInput,
  SubjectVideo,
  CreateSubjectVideoInput,
  UpdateSubjectVideoInput,
  SubjectBundleAccess,
  SubjectBundlePlan,
  SubjectUnitResource,
} from './subjectBundleTypes'

// ─── Map DB Row to SubjectBundle ───────────────────────────────────────────
// ─── Extract YouTube Thumbnail Helper ───────────────────────────────────────
export function extractYouTubeThumbnail(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&\n?#]+)/)
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

// ─── Map DB Row to SubjectBundle ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToBundle(row: any): SubjectBundle {
  const subj = row.subjects
  const sem  = subj?.semesters
  const br   = sem?.branches
  const crs  = br?.courses
  const clg  = crs?.colleges

  return {
    id: String(row.id),
    subjectId: Number(row.subject_id),
    sixMonthPrice: Number(row.six_month_price ?? 0),
    lifetimePrice: Number(row.lifetime_price ?? 0),
    sixMonthEnabled: Boolean(row.six_month_enabled),
    lifetimeEnabled: Boolean(row.lifetime_enabled),
    isActive: Boolean(row.is_active),
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    subjectName: subj?.name || undefined,
    subjectCode: subj?.code || undefined,
    semesterId: sem?.id != null ? Number(sem.id) : undefined,
    semesterNumber: sem?.semester_number != null ? Number(sem.semester_number) : undefined,
    branchName: br?.name || undefined,
    academicCourseName: crs?.name || undefined,
    collegeName: clg?.name || undefined,

    thumbnailUrl: row.thumbnail_url || undefined,
    description: row.description || undefined,
    isSemesterOnly: Boolean(row.is_semester_only),
    rating: row.rating ? Number(row.rating) : 4.8,
    reviews: row.reviews ? Number(row.reviews) : 120,
    instructor: row.instructor || undefined,
  }
}

const BUNDLE_SELECT_WITH_DESC = `
  id, subject_id, six_month_price, lifetime_price,
  six_month_enabled, lifetime_enabled, is_active,
  created_by, created_at, updated_at, thumbnail_url, description, is_semester_only,
  subjects (
    id, name, code,
    semesters (
      id, semester_number,
      branches (
        id, name, code,
        courses (
          id, name,
          colleges ( id, name )
        )
      )
    )
  )
`

const BUNDLE_SELECT_BASE = `
  id, subject_id, six_month_price, lifetime_price,
  six_month_enabled, lifetime_enabled, is_active,
  created_by, created_at, updated_at, thumbnail_url,
  subjects (
    id, name, code,
    semesters (
      id, semester_number,
      branches (
        id, name, code,
        courses (
          id, name,
          colleges ( id, name )
        )
      )
    )
  )
`

const BUNDLE_SELECT = BUNDLE_SELECT_WITH_DESC

// ─── Fetch Bundle for a specific subject ───────────────────────────────────
export async function fetchSubjectBundle(subjectId: number): Promise<SubjectBundle | null> {
  let res = await supabase
    .from('subject_bundles')
    .select(BUNDLE_SELECT_WITH_DESC)
    .eq('subject_id', subjectId)
    .maybeSingle()

  if (res.error && (res.error.message?.includes('description') || res.error.code === '42703' || res.error.code === 'PGRST204')) {
    res = await supabase
      .from('subject_bundles')
      .select(BUNDLE_SELECT_BASE)
      .eq('subject_id', subjectId)
      .maybeSingle()
  }

  if (res.error) {
    console.error('[subjectBundleService] Failed to fetch bundle for subject:', res.error.message)
    return null
  }

  if (!res.data) return null
  const bundle = mapRowToBundle(res.data)

  // Enrich with course thumbnails, ratings, and instructor if not on bundle row
  try {
    const { data: courses } = await supabase
      .from('site_courses')
      .select('thumbnail_url, rating, reviews, instructor')
      .eq('subject_id', subjectId)

    if (courses && courses.length > 0) {
      const courseWithThumb = courses.find(c => c.thumbnail_url)
      if (courseWithThumb?.thumbnail_url && !bundle.thumbnailUrl) {
        bundle.thumbnailUrl = courseWithThumb.thumbnail_url
      }
      const validRatings = courses.filter(c => c.rating != null && c.rating > 0)
      if (validRatings.length > 0) {
        const avg = validRatings.reduce((sum, c) => sum + Number(c.rating), 0) / validRatings.length
        bundle.rating = Number(avg.toFixed(1))
      }
      const totalReviews = courses.reduce((sum, c) => sum + Number(c.reviews || 0), 0)
      if (totalReviews > 0) bundle.reviews = totalReviews
      const instructorWithVal = courses.find(c => c.instructor)
      if (instructorWithVal?.instructor) bundle.instructor = instructorWithVal.instructor
    }

    if (!bundle.thumbnailUrl) {
      const { data: res } = await supabase
        .from('resources')
        .select('thumbnail_url')
        .eq('subject_id', subjectId)
        .not('thumbnail_url', 'is', null)
        .limit(1)
        .maybeSingle()

      if (res?.thumbnail_url) {
        bundle.thumbnailUrl = res.thumbnail_url
      }
    }
  } catch (err) {
    console.warn('[subjectBundleService] Could not enrich single bundle:', err)
  }

  return bundle
}

// ─── Fetch Published Subject Bundles (Courses Page) ─────────────────────────
export async function fetchPublishedSubjectBundles(): Promise<SubjectBundle[]> {
  let { data, error } = await supabase
    .from('subject_bundles')
    .select(BUNDLE_SELECT_WITH_DESC)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error && (error.message?.includes('description') || error.code === '42703' || error.code === 'PGRST204')) {
    const fallback = await supabase
      .from('subject_bundles')
      .select(BUNDLE_SELECT_BASE)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    data = fallback.data as any
    error = fallback.error
  }

  if (error) {
    console.error('[subjectBundleService] Failed to fetch published bundles:', error.message)
    return []
  }

  const bundles = (data ?? []).map(mapRowToBundle)

  try {
    const subjectIds = bundles.map(b => b.subjectId)
    if (subjectIds.length > 0) {
      const [vidsRes, resRes, unitsRes, coursesRes] = await Promise.all([
        supabase.from('subject_videos').select('id, subject_id, thumbnail_url, video_url, course_id').in('subject_id', subjectIds),
        supabase.from('resources').select('subject_id, thumbnail_url, is_bundle_only').in('subject_id', subjectIds).eq('status', 'Published'),
        supabase.from('subject_units').select('subject_id').in('subject_id', subjectIds),
        supabase.from('site_courses').select('id, subject_id, thumbnail_url, rating, reviews, instructor, tags').in('subject_id', subjectIds),
      ])

      const courseBundleMap = new Map<string, boolean>()
      for (const c of coursesRes.data || []) {
        const isB = Boolean(
          (c as any).is_bundle_only ||
          (Array.isArray(c.tags) && c.tags.includes('__bundle_only'))
        )
        courseBundleMap.set(String(c.id), isB)
      }

      const videoCounts = new Map<number, number>()
      const videoThumbs = new Map<number, string>()
      for (const row of vidsRes.data || []) {
        if (row.course_id && courseBundleMap.has(String(row.course_id)) && !courseBundleMap.get(String(row.course_id))) {
          continue // Exclude individual course video from bundle count
        }
        const sid = Number(row.subject_id)
        videoCounts.set(sid, (videoCounts.get(sid) || 0) + 1)
        if (!videoThumbs.has(sid)) {
          const t = (row as any).thumbnail_url || extractYouTubeThumbnail(row.video_url)
          if (t) videoThumbs.set(sid, t)
        }
      }

      const resourceCounts = new Map<number, number>()
      const resourceThumbs = new Map<number, string>()
      for (const row of resRes.data || []) {
        // Individual resources must NOT count towards the bundle resource count
        if (!row.is_bundle_only) continue
        const sid = Number(row.subject_id)
        resourceCounts.set(sid, (resourceCounts.get(sid) || 0) + 1)
        if (row.thumbnail_url && !resourceThumbs.has(sid)) {
          resourceThumbs.set(sid, row.thumbnail_url)
        }
      }

      const unitCounts = new Map<number, number>()
      for (const row of unitsRes.data || []) {
        const sid = Number(row.subject_id)
        unitCounts.set(sid, (unitCounts.get(sid) || 0) + 1)
      }

      const courseMetadata = new Map<number, { thumb?: string; rating?: number; reviews?: number; instructor?: string }>()
      for (const row of coursesRes.data || []) {
        const sid = Number(row.subject_id)
        const current = courseMetadata.get(sid) || {}
        if (row.thumbnail_url && !current.thumb) current.thumb = row.thumbnail_url
        if (row.rating && !current.rating) current.rating = Number(row.rating)
        if (row.reviews) current.reviews = (current.reviews || 0) + Number(row.reviews)
        if (row.instructor && !current.instructor) current.instructor = row.instructor
        courseMetadata.set(sid, current)
      }

      for (const b of bundles) {
        b.videoCount = videoCounts.get(b.subjectId) || 0
        b.resourceCount = resourceCounts.get(b.subjectId) || 0
        b.unitCount = unitCounts.get(b.subjectId) || 0

        const meta = courseMetadata.get(b.subjectId)
        if (!b.thumbnailUrl) {
          b.thumbnailUrl = meta?.thumb || videoThumbs.get(b.subjectId) || resourceThumbs.get(b.subjectId) || undefined
        }
        if (meta?.rating) b.rating = meta.rating
        if (meta?.reviews) b.reviews = meta.reviews
        if (meta?.instructor) b.instructor = meta.instructor
      }
    }
  } catch (err) {
    console.warn('[subjectBundleService] Could not aggregate bundle counts:', err)
  }

  return bundles.filter(b => !b.isSemesterOnly)
}

// ─── Auto-ensure Subject Bundle for a Subject ─────────────────────────────
export async function ensureSubjectBundleForSubject(subjectId: number): Promise<SubjectBundle | null> {
  const existing = await fetchSubjectBundle(subjectId)
  if (existing) return existing

  try {
    const { data: subj } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .maybeSingle()

    return await createSubjectBundle({
      subjectId,
      sixMonthPrice: 499,
      lifetimePrice: 999,
      sixMonthEnabled: true,
      lifetimeEnabled: true,
      isActive: true,
    })
  } catch (err) {
    console.warn('[ensureSubjectBundleForSubject] Could not auto-create bundle:', err)
    return null
  }
}

// ─── Fetch All Bundles (Admin Dashboard) ───────────────────────────────────
export async function fetchAllSubjectBundles(): Promise<SubjectBundle[]> {
  let { data, error } = await supabase
    .from('subject_bundles')
    .select(BUNDLE_SELECT_WITH_DESC)
    .order('created_at', { ascending: false })

  if (error && (error.message?.includes('description') || error.code === '42703' || error.code === 'PGRST204')) {
    const fallback = await supabase
      .from('subject_bundles')
      .select(BUNDLE_SELECT_BASE)
      .order('created_at', { ascending: false })
    data = fallback.data as any
    error = fallback.error
  }

  if (error) {
    console.error('[subjectBundleService] Failed to fetch all bundles:', error.message)
    throw new Error(`Failed to load subject bundles: ${error.message}`)
  }

  const bundles = (data ?? []).map(mapRowToBundle)

  // Enrich with purchase counts and revenue from subject_bundle_purchases
  try {
    const { data: purchases } = await supabase
      .from('subject_bundle_purchases')
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
    console.warn('[subjectBundleService] Could not aggregate bundle purchases:', err)
  }

  return bundles
}

// ─── Create Bundle (Admin) ─────────────────────────────────────────────────
export async function createSubjectBundle(input: CreateSubjectBundleInput): Promise<SubjectBundle> {
  if (input.sixMonthPrice < 0 || input.lifetimePrice < 0) {
    throw new Error('Prices cannot be negative')
  }
  if (!input.sixMonthEnabled && !input.lifetimeEnabled) {
    throw new Error('At least one plan (6-Month or Lifetime) must be enabled')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertObj: Record<string, any> = {
    subject_id: input.subjectId,
    six_month_price: input.sixMonthPrice,
    lifetime_price: input.lifetimePrice,
    six_month_enabled: input.sixMonthEnabled,
    lifetime_enabled: input.lifetimeEnabled,
    is_active: input.isActive,
    thumbnail_url: input.thumbnailUrl || null,
    description: input.description || null,
    is_semester_only: input.isSemesterOnly ?? false,
  }

  let { data, error } = await supabase
    .from('subject_bundles')
    .insert(insertObj)
    .select(BUNDLE_SELECT_WITH_DESC)
    .single()

  if (error && (error.message?.includes('description') || error.message?.includes('is_semester_only') || error.code === '42703' || error.code === 'PGRST204')) {
    delete insertObj.description
    delete insertObj.is_semester_only
    const retry = await supabase
      .from('subject_bundles')
      .insert(insertObj)
      .select(BUNDLE_SELECT_BASE)
      .single()
    data = retry.data as any
    error = retry.error
  }

  if (error) {
    if (error.code === '23505') {
      throw new Error('A bundle already exists for this subject.')
    }
    throw new Error(`Failed to create subject bundle: ${error.message}`)
  }

  return mapRowToBundle(data)
}

// ─── Update Bundle (Admin) ─────────────────────────────────────────────────
export async function updateSubjectBundle(id: string, input: UpdateSubjectBundleInput): Promise<SubjectBundle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

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
  if (input.thumbnailUrl !== undefined) payload.thumbnail_url = input.thumbnailUrl || null
  if (input.description !== undefined) payload.description = input.description || null
  if (input.isSemesterOnly !== undefined) payload.is_semester_only = input.isSemesterOnly

  let { data, error } = await supabase
    .from('subject_bundles')
    .update(payload)
    .eq('id', id)
    .select(BUNDLE_SELECT_WITH_DESC)
    .single()

  if (error && (error.message?.includes('description') || error.message?.includes('is_semester_only') || error.code === '42703' || error.code === 'PGRST204')) {
    delete payload.description
    delete payload.is_semester_only
    const retry = await supabase
      .from('subject_bundles')
      .update(payload)
      .eq('id', id)
      .select(BUNDLE_SELECT_BASE)
      .single()
    data = retry.data as any
    error = retry.error
  }

  if (error) throw new Error(`Failed to update bundle: ${error.message}`)
  return mapRowToBundle(data)
}

// ─── Toggle Bundle Active ──────────────────────────────────────────────────
export async function toggleSubjectBundleActive(id: string, isActive: boolean): Promise<SubjectBundle> {
  return updateSubjectBundle(id, { isActive })
}

// ─── Delete Bundle (Admin) ─────────────────────────────────────────────────
export async function deleteSubjectBundle(id: string): Promise<void> {
  const { error } = await supabase
    .from('subject_bundles')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete subject bundle: ${error.message}`)
}

// ─── Units & Videos Curriculum Management ──────────────────────────────────

export async function fetchSubjectCurriculum(subjectId: number): Promise<{
  units: SubjectUnit[]
  videos: SubjectVideo[]
  resources: SubjectUnitResource[]
}> {
  // 1. Fetch units
  const { data: unitRows, error: unitErr } = await supabase
    .from('subject_units')
    .select('id, subject_id, unit_number, title, description, sort_order, created_at, updated_at')
    .eq('subject_id', subjectId)
    .order('unit_number', { ascending: true })

  if (unitErr) {
    console.warn('[subjectBundleService] Error fetching units:', unitErr.message)
  }

  // 2. Fetch videos
  const { data: videoRows, error: vidErr } = await supabase
    .from('subject_videos')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })

  if (vidErr) {
    console.warn('[subjectBundleService] Error fetching subject videos:', vidErr.message)
  }

  // 3. Fetch resources (Notes/PDFs) belonging to this subject
  const { data: resourceRows, error: resErr } = await supabase
    .from('resources')
    .select(`
      id, title, description, file_url, thumbnail_url, author,
      is_premium, price, downloads, status, unit_id, subject_id, is_bundle_only,
      resource_types ( name )
    `)
    .eq('subject_id', subjectId)
    .eq('status', 'Published')
    .order('created_at', { ascending: false })

  if (resErr) {
    console.warn('[subjectBundleService] Error fetching subject resources:', resErr.message)
  }

  // 4. Fetch courses associated with this subject to enrich video thumbnails, ratings & instructors
  let coursesRows: any[] = []
  try {
    const { data: courses } = await supabase
      .from('site_courses')
      .select('id, title, description, duration, instructor, level, rating, reviews, thumbnail_url, video_url, tags, price')
      .eq('subject_id', subjectId)

    if (courses) coursesRows = courses
  } catch (err) {
    console.warn('[subjectBundleService] Error fetching site_courses for subject enrichment:', err)
  }

  const isBundleCourse = (c: any): boolean => {
    if (c?.is_bundle_only === true) return true
    if (Array.isArray(c?.tags) && c.tags.includes('__bundle_only')) return true
    return false
  }

  const mappedVideos: SubjectVideo[] = (videoRows ?? [])
    .filter((v: any) => {
      // If video row is linked to a site_course, ensure the course is marked as bundle only
      if (v.course_id) {
        const matched = coursesRows.find(c => String(c.id) === String(v.course_id))
        // If it points to an individual course, exclude it from the bundle
        if (matched && !isBundleCourse(matched)) {
          return false
        }
      }
      return true
    })
    .map((v: any) => {
      const matchedCourse = coursesRows.find(
        c => (c.video_url && c.video_url === v.video_url) ||
             (c.title && c.title.trim().toLowerCase() === v.title.trim().toLowerCase())
      )

      const resolvedThumbnail =
        v.thumbnail_url ||
        matchedCourse?.thumbnail_url ||
        extractYouTubeThumbnail(v.video_url) ||
        undefined

      const resolvedInstructor =
        v.instructor ||
        matchedCourse?.instructor ||
        'Skills021 Faculty'

      const resolvedRating = Number(v.rating ?? matchedCourse?.rating ?? 4.8)
      const resolvedReviews = Number(v.reviews ?? matchedCourse?.reviews ?? 0)
      const resolvedLevel = v.level || matchedCourse?.level || 'All Levels'
      const resolvedCourseId = v.course_id || (matchedCourse ? String(matchedCourse.id) : undefined)

      return {
        id: String(v.id),
        subjectId: Number(v.subject_id),
        unitId: v.unit_id ? String(v.unit_id) : null,
        title: v.title,
        description: v.description || matchedCourse?.description || undefined,
        videoUrl: v.video_url,
        duration: v.duration || matchedCourse?.duration || undefined,
        thumbnailUrl: resolvedThumbnail,
        instructor: resolvedInstructor,
        rating: resolvedRating,
        reviews: resolvedReviews,
        level: resolvedLevel,
        courseId: resolvedCourseId,
        sortOrder: Number(v.sort_order ?? 0),
        isFreePreview: Boolean(v.is_free_preview),
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      }
    })

  // CRITICAL: Filter out individual resources (is_bundle_only === false)
  // Individual resources must NOT show under the subject bundle!
  const mappedResources: SubjectUnitResource[] = (resourceRows ?? [])
    .filter((r: any) => Boolean(r.is_bundle_only))
    .map((r) => ({
      id: String(r.id),
      title: r.title,
      description: r.description || undefined,
      fileUrl: r.file_url || undefined,
      thumbnailUrl: r.thumbnail_url || undefined,
      author: r.author || undefined,
      isPremium: Boolean(r.is_premium),
      price: r.price ? Number(r.price) : undefined,
      downloads: Number(r.downloads ?? 0),
      status: r.status,
      typeName: (r.resource_types as any)?.name || 'Notes',
      unitId: r.unit_id ? String(r.unit_id) : null,
      subjectId: Number(r.subject_id),
    }))

  let mappedUnits: SubjectUnit[] = (unitRows ?? []).map((u) => {
    const uId = String(u.id)
    return {
      id: uId,
      subjectId: Number(u.subject_id),
      unitNumber: Number(u.unit_number),
      title: u.title,
      description: u.description || undefined,
      sortOrder: Number(u.sort_order ?? 0),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      videos: mappedVideos.filter((v) => v.unitId === uId),
      resources: mappedResources.filter((r) => r.unitId === uId),
    }
  })

  // Ensure any site_course with a video URL that wasn't in subject_videos is represented
  // CRITICAL: ONLY bundle courses are synthesized into the Subject Bundle! Individual courses are excluded.
  for (const course of coursesRows) {
    if (!isBundleCourse(course)) continue

    if (course.video_url && !mappedVideos.some(v => v.videoUrl === course.video_url)) {
      const fallbackUnitId = mappedUnits[0]?.id || null
      const synthesizedVideo: SubjectVideo = {
        id: `course-${course.id}`,
        subjectId,
        unitId: fallbackUnitId,
        title: course.title,
        description: course.description || undefined,
        videoUrl: course.video_url,
        duration: course.duration || undefined,
        thumbnailUrl: course.thumbnail_url || extractYouTubeThumbnail(course.video_url) || undefined,
        instructor: course.instructor || 'Skills021 Faculty',
        rating: Number(course.rating ?? 4.8),
        reviews: Number(course.reviews ?? 0),
        level: course.level || 'All Levels',
        courseId: String(course.id),
        sortOrder: 99,
        isFreePreview: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mappedVideos.push(synthesizedVideo)
      if (fallbackUnitId) {
        const u = mappedUnits.find(unit => unit.id === fallbackUnitId)
        if (u) {
          u.videos = u.videos || []
          u.videos.push(synthesizedVideo)
        }
      }
    }
  }

  // If there are videos without unit assignment, or if no units exist yet but videos/notes exist:
  const unassignedVideos = mappedVideos.filter(v => !v.unitId || !mappedUnits.some(u => u.id === v.unitId))
  const unassignedResources = mappedResources.filter(r => !r.unitId || !mappedUnits.some(u => u.id === r.unitId))

  if (mappedUnits.length === 0 && (mappedVideos.length > 0 || mappedResources.length > 0)) {
    const defaultUnit: SubjectUnit = {
      id: `virtual-u1-${subjectId}`,
      subjectId,
      unitNumber: 1,
      title: 'Unit 1: Core Lectures & Syllabus',
      description: 'Comprehensive video lectures and curriculum notes for this subject.',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      videos: mappedVideos,
      resources: mappedResources,
    }
    mappedUnits = [defaultUnit]
  } else if (unassignedVideos.length > 0 && mappedUnits.length > 0) {
    // Put unassigned into the first unit so they are always accessible
    mappedUnits[0].videos = [...(mappedUnits[0].videos || []), ...unassignedVideos]
  }

  return {
    units: mappedUnits,
    videos: mappedVideos,
    resources: mappedResources,
  }
}

// ─── Unit CRUD ─────────────────────────────────────────────────────────────
export async function createSubjectUnit(input: CreateSubjectUnitInput): Promise<SubjectUnit> {
  const { data, error } = await supabase
    .from('subject_units')
    .insert({
      subject_id: input.subjectId,
      unit_number: input.unitNumber,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      sort_order: input.sortOrder ?? input.unitNumber,
    })
    .select('id, subject_id, unit_number, title, description, sort_order, created_at, updated_at')
    .single()

  if (error) throw new Error(`Failed to create unit: ${error.message}`)
  return {
    id: String(data.id),
    subjectId: Number(data.subject_id),
    unitNumber: Number(data.unit_number),
    title: data.title,
    description: data.description || undefined,
    sortOrder: Number(data.sort_order ?? 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    videos: [],
    resources: [],
  }
}

export async function updateSubjectUnit(id: string, input: UpdateSubjectUnitInput): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.description !== undefined) payload.description = input.description.trim()
  if (input.unitNumber !== undefined) payload.unit_number = input.unitNumber
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder

  const { error } = await supabase.from('subject_units').update(payload).eq('id', id)
  if (error) throw new Error(`Failed to update unit: ${error.message}`)
}

export async function deleteSubjectUnit(id: string): Promise<void> {
  const { error } = await supabase.from('subject_units').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete unit: ${error.message}`)
}

// ─── Video CRUD ────────────────────────────────────────────────────────────
export async function createSubjectVideo(input: CreateSubjectVideoInput): Promise<SubjectVideo> {
  const insertPayload: Record<string, any> = {
    subject_id: input.subjectId,
    unit_id: input.unitId || null,
    title: input.title.trim(),
    description: input.description?.trim() || '',
    video_url: input.videoUrl.trim(),
    duration: input.duration?.trim() || '',
    sort_order: input.sortOrder ?? 0,
    is_free_preview: Boolean(input.isFreePreview),
  }
  if (input.thumbnailUrl) insertPayload.thumbnail_url = input.thumbnailUrl
  if (input.instructor) insertPayload.instructor = input.instructor
  if (input.rating) insertPayload.rating = input.rating
  if (input.reviews) insertPayload.reviews = input.reviews
  if (input.level) insertPayload.level = input.level
  if (input.courseId) insertPayload.course_id = input.courseId

  let { data, error } = await supabase
    .from('subject_videos')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) {
    // Retry without extra columns if migration is pending
    const fallback = await supabase
      .from('subject_videos')
      .insert({
        subject_id: input.subjectId,
        unit_id: input.unitId || null,
        title: input.title.trim(),
        description: input.description?.trim() || '',
        video_url: input.videoUrl.trim(),
        duration: input.duration?.trim() || '',
        sort_order: input.sortOrder ?? 0,
        is_free_preview: Boolean(input.isFreePreview),
      })
      .select('id, subject_id, unit_id, title, description, video_url, duration, sort_order, is_free_preview, created_at, updated_at')
      .single()

    data = fallback.data
    error = fallback.error
  }

  if (error) throw new Error(`Failed to add video: ${error.message}`)
  return {
    id: String(data.id),
    subjectId: Number(data.subject_id),
    unitId: data.unit_id ? String(data.unit_id) : null,
    title: data.title,
    description: data.description || undefined,
    videoUrl: data.video_url,
    duration: data.duration || undefined,
    thumbnailUrl: data.thumbnail_url || input.thumbnailUrl || extractYouTubeThumbnail(data.video_url) || undefined,
    instructor: data.instructor || input.instructor || 'Skills021 Faculty',
    rating: Number(data.rating ?? input.rating ?? 4.8),
    reviews: Number(data.reviews ?? input.reviews ?? 0),
    level: data.level || input.level || 'All Levels',
    courseId: data.course_id || input.courseId,
    sortOrder: Number(data.sort_order ?? 0),
    isFreePreview: Boolean(data.is_free_preview),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateSubjectVideo(id: string, input: UpdateSubjectVideoInput): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.description !== undefined) payload.description = input.description.trim()
  if (input.videoUrl !== undefined) payload.video_url = input.videoUrl.trim()
  if (input.duration !== undefined) payload.duration = input.duration.trim()
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder
  if (input.isFreePreview !== undefined) payload.is_free_preview = input.isFreePreview
  if (input.unitId !== undefined) payload.unit_id = input.unitId || null
  if (input.thumbnailUrl !== undefined) payload.thumbnail_url = input.thumbnailUrl
  if (input.instructor !== undefined) payload.instructor = input.instructor
  if (input.rating !== undefined) payload.rating = input.rating
  if (input.reviews !== undefined) payload.reviews = input.reviews
  if (input.level !== undefined) payload.level = input.level
  if (input.courseId !== undefined) payload.course_id = input.courseId

  const { error } = await supabase.from('subject_videos').update(payload).eq('id', id)
  if (error) {
    // Retry with basic columns if extra columns failed
    delete payload.thumbnail_url
    delete payload.instructor
    delete payload.rating
    delete payload.reviews
    delete payload.level
    delete payload.course_id
    const { error: retryErr } = await supabase.from('subject_videos').update(payload).eq('id', id)
    if (retryErr) throw new Error(`Failed to update video: ${retryErr.message}`)
  }
}

export async function deleteSubjectVideo(id: string): Promise<void> {
  const { error } = await supabase.from('subject_videos').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete video: ${error.message}`)
}

// ─── Authoritative Entitlement & Access Check ──────────────────────────────
export async function hasSubjectBundleAccess(userId: string | null, subjectId: number): Promise<boolean> {
  if (!userId || !subjectId) return false

  try {
    const { data, error } = await supabase.rpc('has_subject_bundle_access', {
      p_user_id: userId,
      p_subject_id: subjectId,
    })

    if (!error && data !== null && Boolean(data) === true) {
      return true
    }
  } catch (err) {
    console.warn('[subjectBundleService] RPC error on has_subject_bundle_access:', err)
  }

  // Fallback to comprehensive entitlement check
  const ent = await getUserSubjectBundleEntitlement(userId, subjectId)
  return ent.hasAccess
}

export async function getUserSubjectBundleEntitlement(
  userId: string | null,
  subjectId: number
): Promise<SubjectBundleAccess> {
  if (!userId || !subjectId) return { hasAccess: false }

  let entitlement: SubjectBundleAccess = { hasAccess: false }
  const now = new Date().toISOString()

  // 1. Check RPC has_subject_bundle_access first
  try {
    const { data: rpcAccess } = await supabase.rpc('has_subject_bundle_access', {
      p_user_id: userId,
      p_subject_id: subjectId,
    })
    if (rpcAccess === true) {
      entitlement.hasAccess = true
      entitlement.paymentStatus = 'paid'
      entitlement.status = 'active'
    }
  } catch {}

  // 2. Check direct subject_bundle_purchases table
  try {
    const { data: directRows } = await supabase
      .from('subject_bundle_purchases')
      .select('id, plan_type, payment_status, status, starts_at, expires_at, created_at')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (directRows && directRows.length > 0) {
      const activeP = directRows.find(p =>
        (p.payment_status === 'paid' || p.payment_status === 'free') &&
        p.status === 'active' &&
        (!p.expires_at || p.expires_at > now)
      )

      if (activeP) {
        entitlement.hasAccess = true
        entitlement.purchaseId = activeP.id
        entitlement.planType = (activeP.plan_type as SubjectBundlePlan) || 'six_month'
        entitlement.paymentStatus = 'paid'
        entitlement.status = 'active'
        entitlement.startsAt = activeP.starts_at || undefined
        entitlement.expiresAt = activeP.expires_at || undefined
        entitlement.isExpired = false
        if (activeP.expires_at) {
          const msLeft = new Date(activeP.expires_at).getTime() - Date.now()
          entitlement.daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
        }
        return entitlement
      }

      const pendingP = directRows.find(p => p.payment_status === 'pending')
      if (pendingP && !entitlement.hasAccess) {
        entitlement.hasPending = true
        entitlement.paymentStatus = 'pending'
      }
    }
  } catch (err) {
    console.warn('[subjectBundleService] Error checking direct subject_bundle_purchases:', err)
  }

  // 3. Check active semester_bundle_purchases table (unlocks all mapped subjects in that semester bundle)
  try {
    const { data: semPurchases } = await supabase
      .from('semester_bundle_purchases')
      .select('id, bundle_id, semester_id, plan_type, payment_status, status, starts_at, expires_at')
      .eq('user_id', userId)
      .eq('payment_status', 'paid')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (semPurchases && semPurchases.length > 0) {
      for (const sp of semPurchases) {
        if (sp.expires_at && sp.expires_at <= now) continue

        let coversSubject = false

        // A. Match via semester_bundle_subjects mapping
        if (sp.bundle_id) {
          const { data: mapRows } = await supabase
            .from('semester_bundle_subjects')
            .select('subject_bundles(subject_id)')
            .eq('bundle_id', sp.bundle_id)

          if (mapRows && mapRows.length > 0) {
            coversSubject = mapRows.some((m: any) => Number(m?.subject_bundles?.subject_id) === Number(subjectId))
          }
        }

        // B. Fallback match via subject's semester_id
        if (!coversSubject && sp.semester_id) {
          const { data: subjRecord } = await supabase
            .from('subjects')
            .select('semester_id')
            .eq('id', subjectId)
            .maybeSingle()

          if (subjRecord && Number(subjRecord.semester_id) === Number(sp.semester_id)) {
            coversSubject = true
          }
        }

        if (coversSubject) {
          entitlement.hasAccess = true
          entitlement.hasPending = false
          entitlement.purchaseId = sp.id
          entitlement.planType = (sp.plan_type as SubjectBundlePlan) || 'six_month'
          entitlement.paymentStatus = 'paid'
          entitlement.status = 'active'
          entitlement.startsAt = sp.starts_at || undefined
          entitlement.expiresAt = sp.expires_at || undefined
          entitlement.isExpired = false
          entitlement.viaSemesterBundle = true
          if (sp.expires_at) {
            const msLeft = new Date(sp.expires_at).getTime() - Date.now()
            entitlement.daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
          }
          return entitlement
        }
      }
    }
  } catch (semErr) {
    console.warn('[subjectBundleService] Error checking semester_bundle_purchases:', semErr)
  }

  // 4. Authoritative check on enrollments table (both subject_bundle & semester_bundle)
  try {
    const { data: enrRows } = await supabase
      .from('enrollments')
      .select('id, item_type, item_id, item_title, payment_status, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (enrRows && enrRows.length > 0) {
      // 4A. Match direct subject bundle enrollment
      const bundle = await fetchSubjectBundle(subjectId).catch(() => null)
      const matching = enrRows.find(e => 
        e.item_type === 'subject_bundle' && (
          (bundle?.id && e.item_id?.includes(bundle.id)) ||
          e.item_id?.includes(String(subjectId)) ||
          (bundle?.subjectName && e.item_title?.toLowerCase().includes(bundle.subjectName.toLowerCase()))
        )
      )

      if (matching) {
        if (matching.payment_status === 'paid' || matching.payment_status === 'free' || matching.status === 'paid' || matching.status === 'active') {
          entitlement.hasAccess = true
          entitlement.hasPending = false
          entitlement.paymentStatus = 'paid'
          entitlement.status = 'active'
          const plan = matching.item_id?.includes('lifetime') ? 'lifetime' : 'six_month'
          entitlement.planType = plan as SubjectBundlePlan

          // Auto-heal subject_bundle_purchases in background
          Promise.resolve(
            supabase
              .from('subject_bundle_purchases')
              .update({
                payment_status: 'paid',
                status: 'active',
                approved_at: new Date().toISOString(),
                starts_at: new Date().toISOString(),
              })
              .eq('enrollment_id', matching.id)
          ).catch(() => {})

          return entitlement
        } else if (matching.payment_status === 'pending' && !entitlement.hasAccess) {
          entitlement.hasPending = true
          entitlement.paymentStatus = 'pending'
        }
      }

      // 4B. Match semester bundle enrollment
      const paidSemEnrs = enrRows.filter(e =>
        e.item_type === 'semester_bundle' &&
        (e.payment_status === 'paid' || e.payment_status === 'free' || e.status === 'paid' || e.status === 'active')
      )

      for (const semEnr of paidSemEnrs) {
        const bundleId = semEnr.item_id?.split(':')[0]
        if (bundleId) {
          const { data: mapRows } = await supabase
            .from('semester_bundle_subjects')
            .select('subject_bundles(subject_id)')
            .eq('bundle_id', bundleId)

          const matches = mapRows?.some((m: any) => Number(m?.subject_bundles?.subject_id) === Number(subjectId))
          if (matches) {
            entitlement.hasAccess = true
            entitlement.hasPending = false
            entitlement.paymentStatus = 'paid'
            entitlement.status = 'active'
            const plan = semEnr.item_id?.includes('lifetime') ? 'lifetime' : 'six_month'
            entitlement.planType = plan as SubjectBundlePlan
            entitlement.viaSemesterBundle = true
            return entitlement
          }
        }
      }
    }
  } catch (enrErr) {
    console.warn('[subjectBundleService] Error checking enrollments fallback:', enrErr)
  }

  return entitlement
}

// ─── Submit Manual UPI Payment Proof for Subject Bundle ─────────────────────
export interface SubmitSubjectBundleProofInput {
  userId: string
  bundleId: string
  subjectId: number
  subjectTitle: string
  planType: SubjectBundlePlan
  firstName: string
  lastName: string
  email: string
  phone: string
  amount: number
  utrNumber: string
  screenshotUrl: string
  originalAmount?: number
  productDiscountAmount?: number
  couponCode?: string | null
  couponDiscountAmount?: number
  appliedDiscountId?: string | null
  appliedCouponId?: string | null
}

export async function submitSubjectBundlePaymentProof(input: SubmitSubjectBundleProofInput): Promise<void> {
  const itemId = `${input.bundleId}:${input.planType}`
  const planLabel = input.planType === 'lifetime' ? 'Lifetime Access' : '6 Months Access'
  const title = `Subject Bundle: ${input.subjectTitle} (${planLabel})`

  // 1. Insert/Upsert into enrollments table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollmentPayload: Record<string, any> = {
    item_type: 'subject_bundle',
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
    if (enrError.message?.includes('enrollments_item_type_check')) {
      throw new Error(
        'Database update required: Please run "20260905_fix_enrollments_item_type_check.sql" in Supabase SQL editor to allow subject_bundle.'
      )
    }
    throw new Error(`Failed to create bundle enrollment: ${enrError.message}`)
  }

  const enrollmentId = enrData.id

  // 2. Insert pending record into subject_bundle_purchases
  const { error: purchaseError } = await supabase
    .from('subject_bundle_purchases')
    .insert({
      user_id: input.userId,
      bundle_id: input.bundleId,
      subject_id: input.subjectId,
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
    console.warn('[subjectBundleService] Error inserting pending subject_bundle_purchases:', purchaseError.message)
  }
}

// ─── Admin Approval for Subject Bundle ─────────────────────────────────────
export async function approveSubjectBundlePayment(enrollmentId: string, adminId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('approve_subject_bundle_purchase', {
    p_enrollment_id: enrollmentId,
    p_admin_id: adminId,
  })

  if (error) {
    console.error('[subjectBundleService] Failed to approve bundle via RPC:', error.message)
    throw new Error(`Failed to approve subject bundle payment: ${error.message}`)
  }

  return Boolean((data as any)?.success)
}

// ─── Fetch Subject Bundles for a specific Semester (Hierarchy linked) ──────
export async function fetchSubjectBundlesBySemester(semesterId: number): Promise<SubjectBundle[]> {
  const { data: subjRows } = await supabase
    .from('subjects')
    .select('id')
    .eq('semester_id', semesterId)

  if (!subjRows || subjRows.length === 0) return []
  const subjectIds = subjRows.map(s => Number(s.id))

  const allBundles = await fetchAllSubjectBundles().catch(() => [])
  return allBundles.filter(b => subjectIds.includes(b.subjectId))
}
