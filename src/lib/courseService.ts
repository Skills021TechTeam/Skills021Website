import { supabase } from './supabase'
import { uploadToBackblaze, deleteBackblazeFile, isBackblazeRef } from './backblazeService'
import type { Course, CourseGroup, CourseSubcategory } from '../store/contentStore'
import { ensureSubjectBundleForSubject } from './subjectBundleService'

// ─── Auto-link Course & Video to Subject Bundle Curriculum ────────────────────
export async function linkCourseToSubjectBundleAndUnits(
  subjectId: number,
  courseTitle: string,
  courseDescription?: string,
  videoUrl?: string | null,
  duration?: string | null,
  thumbnailUrl?: string | null,
  instructor?: string | null,
  level?: string | null,
  courseId?: number | null
) {
  try {
    // 1. Ensure Subject Bundle exists
    await ensureSubjectBundleForSubject(subjectId)

    // 2. Set bundle thumbnail if provided and not yet set
    if (thumbnailUrl) {
      try {
        await supabase
          .from('subject_bundles')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('subject_id', subjectId)
          .is('thumbnail_url', null)
      } catch {
        // Safe fallback if column not yet applied
      }
    }

    // 3. If video URL exists, ensure it is organized under a unit in subject_videos
    if (videoUrl) {
      // Find or create Unit 1
      let unitId: string | null = null
      const { data: existingUnit } = await supabase
        .from('subject_units')
        .select('id')
        .eq('subject_id', subjectId)
        .order('unit_number', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existingUnit?.id) {
        unitId = String(existingUnit.id)
      } else {
        const { data: newUnit, error: unitErr } = await supabase
          .from('subject_units')
          .insert({
            subject_id: subjectId,
            unit_number: 1,
            title: 'Unit 1: Core Lectures & Concepts',
            description: 'Video lectures and core syllabus coverage for this subject.',
            sort_order: 1,
          })
          .select('id')
          .single()

        if (!unitErr && newUnit?.id) {
          unitId = String(newUnit.id)
        }
      }

      // Check if video already exists in subject_videos
      const { data: existingVideo } = await supabase
        .from('subject_videos')
        .select('id, thumbnail_url')
        .eq('subject_id', subjectId)
        .eq('video_url', videoUrl)
        .maybeSingle()

      if (!existingVideo) {
        const videoPayload: Record<string, any> = {
          subject_id: subjectId,
          unit_id: unitId,
          title: courseTitle,
          description: courseDescription || '',
          video_url: videoUrl,
          duration: duration || '',
          sort_order: 1,
          is_free_preview: false,
        }
        if (thumbnailUrl) videoPayload.thumbnail_url = thumbnailUrl
        if (instructor) videoPayload.instructor = instructor
        if (level) videoPayload.level = level
        if (courseId) videoPayload.course_id = courseId

        const { error: insertErr } = await supabase.from('subject_videos').insert(videoPayload)
        // If metadata columns fail due to pending migration, retry with base columns
        if (insertErr) {
          await supabase.from('subject_videos').insert({
            subject_id: subjectId,
            unit_id: unitId,
            title: courseTitle,
            description: courseDescription || '',
            video_url: videoUrl,
            duration: duration || '',
            sort_order: 1,
            is_free_preview: false,
          })
        }
      } else if (thumbnailUrl && !existingVideo.thumbnail_url) {
        try {
          await supabase
            .from('subject_videos')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', existingVideo.id)
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('[courseService] linkCourseToSubjectBundleAndUnits error:', err)
  }
}

// A linked "Notes" subject is stored as a hidden entry inside the existing
// `tags` column (e.g. "__notes:Data Structures") instead of a new database
// column — this keeps course ⇄ notes linking working with zero schema changes.
const NOTES_TAG_PREFIX = '__notes:'
const encodeNotesTag = (subject: string) => `${NOTES_TAG_PREFIX}${subject}`
const isNotesTag = (t: string) => t.startsWith(NOTES_TAG_PREFIX)
const stripNotesTags = (tags: string[] | null | undefined) => (tags ?? []).filter(t => !isNotesTag(t))
const extractNotesSubject = (tags: string[] | null | undefined) =>
  (tags ?? []).find(isNotesTag)?.slice(NOTES_TAG_PREFIX.length) ?? ''

// Tag indicating this course is uploaded as curriculum directly under a Subject Bundle
// rather than an individual standalone course sold in 'All Courses'.
const BUNDLE_ONLY_TAG = '__bundle_only'
const isBundleOnlyTag = (t: string) => t === BUNDLE_ONLY_TAG
const stripInternalTags = (tags: string[] | null | undefined) =>
  (tags ?? []).filter(t => !isNotesTag(t) && !isBundleOnlyTag(t))

// ─── DB Row Shape (public.site_courses) ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SiteCourseRow {
  id: number
  title: string
  description: string | null
  course_group: string
  subcategory: string
  instructor: string | null
  duration: string | null
  lectures: number | null
  level: string
  rating: number | null
  reviews: number | null
  is_free: boolean
  price: number | null
  tags: string[] | null
  thumbnail_url: string | null
  video_url: string | null
  status: string
  enrolled: number | null
  gradient_from: string | null
  gradient_to: string | null
  created_at: string
  updated_at: string | null
  subject_id: number | null
  is_bundle_only?: boolean | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subjects?: any
}

const COURSE_SELECT = `
  id, title, description, course_group, subcategory, instructor, duration,
  lectures, level, rating, reviews, is_free, price, tags, thumbnail_url,
  video_url, status, enrolled, gradient_from, gradient_to, created_at, updated_at,
  subject_id, is_bundle_only,
  subjects (
    id, name, code,
    semesters (
      id, semester_number,
      branches (
        id, name, code,
        courses (
          id, name, duration,
          colleges ( id, name, short_name, city, state )
        )
      )
    )
  )
`

// Used when is_bundle_only column is not yet present in site_courses table
const COURSE_SELECT_NO_BUNDLE_COL = `
  id, title, description, course_group, subcategory, instructor, duration,
  lectures, level, rating, reviews, is_free, price, tags, thumbnail_url,
  video_url, status, enrolled, gradient_from, gradient_to, created_at, updated_at,
  subject_id,
  subjects (
    id, name, code,
    semesters (
      id, semester_number,
      branches (
        id, name, code,
        courses (
          id, name, duration,
          colleges ( id, name, short_name, city, state )
        )
      )
    )
  )
`

// Used when the `subject_id` column/FK exists but the embedded `subjects`
// relationship isn't resolvable yet (e.g. PostgREST's schema cache hasn't
// picked up the FK after the migration ran). Still returns subject_id so
// hierarchy filtering keeps working once the cache catches up.
const COURSE_SELECT_NO_JOIN = `
  id, title, description, course_group, subcategory, instructor, duration,
  lectures, level, rating, reviews, is_free, price, tags, thumbnail_url,
  video_url, status, enrolled, gradient_from, gradient_to, created_at, updated_at,
  subject_id
`

// Used when the `site_courses.subject_id` column itself doesn't exist yet —
// i.e. the 20260806_courses_academic_hierarchy.sql migration hasn't been run
// against this Supabase project at all. Falls all the way back to the
// original columns so the Courses panel still loads and works; only the new
// Academic Filter will be empty until the migration is applied.
const COURSE_SELECT_LEGACY = `
  id, title, description, course_group, subcategory, instructor, duration,
  lectures, level, rating, reviews, is_free, price, tags, thumbnail_url,
  video_url, status, enrolled, gradient_from, gradient_to, created_at, updated_at
`

// Runs a site_courses query, gracefully degrading the select list if the
// academic-hierarchy migration hasn't been applied yet (or Supabase's
// PostgREST schema cache hasn't refreshed after it was applied), so the
// public Courses page and Admin panel never hard-fail because of it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryCoursesWithFallback(build: (select: string) => any): Promise<SiteCourseRow[]> {
  const isSchemaIssue = (message: string) =>
    /relationship|schema cache|column .* does not exist|subject_id|is_bundle_only/i.test(message)

  let { data, error } = await build(COURSE_SELECT)
  if (error && isSchemaIssue(error.message)) {
    ;({ data, error } = await build(COURSE_SELECT_NO_BUNDLE_COL))
  }
  if (error && isSchemaIssue(error.message)) {
    console.warn('[courseService] Falling back without subjects join — run the academic hierarchy migration to enable it:', error.message)
    ;({ data, error } = await build(COURSE_SELECT_NO_JOIN))
  }
  if (error && isSchemaIssue(error.message)) {
    console.warn('[courseService] Falling back without subject_id column:', error.message)
    ;({ data, error } = await build(COURSE_SELECT_LEGACY))
  }
  if (error) throw new Error(`Failed to fetch courses: ${error.message}`)
  return (data ?? []) as unknown as SiteCourseRow[]
}

// ─── Map DB row → Frontend Course ───────────────────────────────────────────
function mapRowToCourse(row: SiteCourseRow): Course {
  const subj = row.subjects
  const sem  = subj?.semesters
  const br   = sem?.branches
  const crs  = br?.courses
  const clg  = crs?.colleges

  return {
    id: String(row.id),
    title: row.title ?? '',
    description: row.description ?? '',
    group: (row.course_group ?? 'College & Tech Courses') as CourseGroup,
    subcategory: (row.subcategory ?? 'DSA') as CourseSubcategory,
    instructor: row.instructor ?? 'Skills021 Team',
    duration: row.duration ?? '',
    lectures: row.lectures ?? 0,
    level: (row.level ?? 'Beginner') as Course['level'],
    rating: row.rating ?? 4.5,
    reviews: row.reviews ?? 0,
    price: row.is_free ? 'FREE' : (row.price ?? 0),
    tags: stripInternalTags(row.tags),
    thumbnail: row.thumbnail_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    modules: [],
    status: (row.status ?? 'Draft') as Course['status'],
    enrolled: row.enrolled ?? 0,
    gradientFrom: row.gradient_from ?? '#6C63FF',
    gradientTo: row.gradient_to ?? '#00BFA6',
    createdAt: row.created_at ?? '',
    notesSubject: extractNotesSubject(row.tags),
    isBundleOnly: Boolean(row.is_bundle_only || (row.tags ?? []).includes(BUNDLE_ONLY_TAG)),
    college:          clg?.name ?? undefined,
    academicCourse:   crs?.name ?? undefined,
    branch:           br?.name ?? undefined,
    semester:         sem?.semester_number != null ? String(sem.semester_number) : undefined,
    subject:          subj?.name ?? undefined,
    collegeId:        clg?.id,
    academicCourseId: crs?.id,
    branchId:         br?.id,
    semesterId:       sem?.id,
    subjectId:        subj?.id ?? row.subject_id ?? undefined,
  }
}

// Shared check used by create/update fallbacks below — matches the same
// cases queryCoursesWithFallback() already handles for fetches: the
// subject_id column missing entirely, OR the column existing but the FK
// relationship not yet visible in PostgREST's schema cache.
const isCourseSchemaIssue = (message: string) =>
  /relationship|schema cache|column .* does not exist|subject_id/i.test(message)

// ─── Fetch Published Courses (public /courses page) ─────────────────────────
export async function fetchPublishedSiteCourses(): Promise<Course[]> {
  const data = await queryCoursesWithFallback((select) =>
    supabase
      .from('site_courses')
      .select(select)
      .eq('status', 'Published')
      .order('created_at', { ascending: false })
  )
  return data.map(mapRowToCourse)
}

// ─── Fetch All Courses (Admin) ───────────────────────────────────────────────
export async function fetchAllSiteCourses(): Promise<Course[]> {
  const data = await queryCoursesWithFallback((select) =>
    supabase
      .from('site_courses')
      .select(select)
      .order('created_at', { ascending: false })
  )
  return data.map(mapRowToCourse)
}

// ─── Create Course ────────────────────────────────────────────────────────────
export interface CreateSiteCourseInput {
  title: string
  description: string
  group: CourseGroup
  subcategory: CourseSubcategory
  instructor: string
  duration: string
  lectures: number
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  isFree: boolean
  price: number
  tags: string[]
  thumbnailUrl?: string
  videoUrl?: string
  status: 'Published' | 'Draft'
  gradientFrom?: string
  gradientTo?: string
  notesSubject?: string
  // Academic hierarchy — same College → Course → Branch → Semester → Subject
  // chain used by the Resources panel. Only the leaf `subjectId` is stored;
  // the rest of the chain is derived automatically via joins.
  subjectId?: number | null
  // True if uploaded under a Subject Bundle (no individual course price, hidden from 'All Courses')
  isBundleOnly?: boolean
}

export async function createSiteCourse(input: CreateSiteCourseInput): Promise<Course> {
  const isBundle = Boolean(input.isBundleOnly)
  const basePayload = {
    title: input.title,
    description: input.description,
    course_group: input.group,
    subcategory: input.subcategory,
    instructor: input.instructor || 'Skills021 Team',
    duration: input.duration,
    lectures: input.lectures ?? 0,
    level: input.level,
    is_free: isBundle ? false : input.isFree,
    price: isBundle ? 0 : (input.isFree ? 0 : (input.price ?? 0)),
    tags: [
      ...stripInternalTags(input.tags),
      ...(input.notesSubject?.trim() ? [encodeNotesTag(input.notesSubject.trim())] : []),
      ...(isBundle ? [BUNDLE_ONLY_TAG] : []),
    ],
    thumbnail_url: input.thumbnailUrl || null,
    video_url: input.videoUrl || null,
    status: input.status,
    enrolled: 0,
    rating: 4.5,
    reviews: 0,
    gradient_from: input.gradientFrom ?? '#6C63FF',
    gradient_to: input.gradientTo ?? '#00BFA6',
    is_bundle_only: isBundle,
  }

  const fullPayload = {
    ...basePayload,
    subject_id: input.subjectId ? Number(input.subjectId) : null,
  }

  let { data, error } = await supabase
    .from('site_courses')
    .insert(fullPayload)
    .select(COURSE_SELECT)
    .single()

  let subjectLinkFailed = false

  // 1. If is_bundle_only column is missing from DB, retry with subject_id and COURSE_SELECT_NO_BUNDLE_COL
  if (error && /is_bundle_only/i.test(error.message)) {
    const { is_bundle_only: _drop, ...payloadWithoutBundle } = fullPayload
    ;({ data, error } = await supabase
      .from('site_courses')
      .insert(payloadWithoutBundle)
      .select(COURSE_SELECT_NO_BUNDLE_COL)
      .single())
  }

  // 2. If subjects join relationship is unresolvable in PostgREST schema cache, retry without join
  if (error && isCourseSchemaIssue(error.message) && !/subject_id.*does not exist/i.test(error.message)) {
    const { is_bundle_only: _drop, ...payloadWithoutBundle } = fullPayload
    ;({ data, error } = await supabase
      .from('site_courses')
      .insert(payloadWithoutBundle)
      .select(COURSE_SELECT_NO_JOIN)
      .single())
  }

  // 3. Only if subject_id column itself does NOT exist in DB, fallback without subject_id
  if (error && isCourseSchemaIssue(error.message)) {
    console.warn('[courseService] Creating course without subject_id — run migration to enable it:', error.message)
    subjectLinkFailed = !!input.subjectId
    const { is_bundle_only: _dropBundle, subject_id: _dropSubj, ...legacyPayload } = fullPayload
    ;({ data, error } = await supabase
      .from('site_courses')
      .insert(legacyPayload)
      .select(COURSE_SELECT_LEGACY)
      .single())
  }

  if (error) throw new Error(`Failed to create course: ${error.message}`)
  const course = mapRowToCourse(data as unknown as SiteCourseRow)
  if (subjectLinkFailed) (course as Course & { _subjectLinkFailed?: boolean })._subjectLinkFailed = true

  // Auto-save under Subject Bundle & Units ONLY when uploaded as bundle
  if (isBundle && input.subjectId) {
    linkCourseToSubjectBundleAndUnits(
      Number(input.subjectId),
      input.title,
      input.description,
      input.videoUrl,
      input.duration,
      input.thumbnailUrl,
      input.instructor,
      input.level,
      Number(course.id)
    ).catch(err => console.warn('[createSiteCourse] Auto-mapping to subject bundle failed:', err))
  }

  return course
}

// ─── Update Course ────────────────────────────────────────────────────────────
export interface UpdateSiteCourseInput {
  title?: string
  description?: string
  group?: CourseGroup
  subcategory?: CourseSubcategory
  instructor?: string
  duration?: string
  lectures?: number
  level?: 'Beginner' | 'Intermediate' | 'Advanced'
  isFree?: boolean
  price?: number
  tags?: string[]
  thumbnailUrl?: string
  videoUrl?: string
  status?: 'Published' | 'Draft'
  notesSubject?: string
  subjectId?: number | null
  isBundleOnly?: boolean
}

export async function updateSiteCourse(id: string, input: UpdateSiteCourseInput): Promise<Course> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {}
  if (input.title !== undefined) payload.title = input.title
  if (input.description !== undefined) payload.description = input.description
  if (input.group !== undefined) payload.course_group = input.group
  if (input.subcategory !== undefined) payload.subcategory = input.subcategory
  if (input.instructor !== undefined) payload.instructor = input.instructor
  if (input.duration !== undefined) payload.duration = input.duration
  if (input.lectures !== undefined) payload.lectures = input.lectures
  if (input.level !== undefined) payload.level = input.level
  
  if (input.isBundleOnly !== undefined) {
    payload.is_bundle_only = input.isBundleOnly
    if (input.isBundleOnly) {
      payload.is_free = false
      payload.price = 0
    } else {
      if (input.isFree !== undefined) payload.is_free = input.isFree
      if (input.price !== undefined) payload.price = input.price
    }
  } else {
    if (input.isFree !== undefined) payload.is_free = input.isFree
    if (input.price !== undefined) payload.price = input.price
  }

  if (input.tags !== undefined || input.notesSubject !== undefined || input.isBundleOnly !== undefined) {
    const rawTags = stripInternalTags(input.tags ?? [])
    if (input.notesSubject?.trim()) rawTags.push(encodeNotesTag(input.notesSubject.trim()))
    if (input.isBundleOnly) rawTags.push(BUNDLE_ONLY_TAG)
    payload.tags = rawTags
  }
  if (input.thumbnailUrl !== undefined) payload.thumbnail_url = input.thumbnailUrl
  if (input.videoUrl !== undefined) payload.video_url = input.videoUrl
  if (input.status !== undefined) payload.status = input.status
  if (input.subjectId !== undefined) payload.subject_id = input.subjectId || null
  payload.updated_at = new Date().toISOString()

  let { data, error } = await supabase
    .from('site_courses')
    .update(payload)
    .eq('id', id)
    .select(COURSE_SELECT)
    .single()

  let subjectLinkFailed = false

  // 1. If is_bundle_only column missing from DB, retry keeping subject_id
  if (error && /is_bundle_only/i.test(error.message)) {
    const { is_bundle_only: _drop, ...payloadWithoutBundle } = payload
    ;({ data, error } = await supabase
      .from('site_courses')
      .update(payloadWithoutBundle)
      .eq('id', id)
      .select(COURSE_SELECT_NO_BUNDLE_COL)
      .single())
  }

  // 2. If subjects join relationship unresolvable in PostgREST schema cache, retry without join
  if (error && isCourseSchemaIssue(error.message) && !/subject_id.*does not exist/i.test(error.message)) {
    const { is_bundle_only: _drop, ...payloadWithoutBundle } = payload
    ;({ data, error } = await supabase
      .from('site_courses')
      .update(payloadWithoutBundle)
      .eq('id', id)
      .select(COURSE_SELECT_NO_JOIN)
      .single())
  }

  // 3. Only if subject_id column itself does NOT exist in DB, fallback without subject_id
  if (error && isCourseSchemaIssue(error.message)) {
    console.warn('[courseService] Updating course without subject_id:', error.message)
    subjectLinkFailed = 'subject_id' in payload && !!payload.subject_id
    const { subject_id: _dropSubj, is_bundle_only: _dropBundle, ...payloadFallback } = payload
    ;({ data, error } = await supabase
      .from('site_courses')
      .update(payloadFallback)
      .eq('id', id)
      .select(COURSE_SELECT_LEGACY)
      .single())
  }

  if (error) throw new Error(`Failed to update course: ${error.message}`)
  const course = mapRowToCourse(data as unknown as SiteCourseRow)
  if (subjectLinkFailed) (course as Course & { _subjectLinkFailed?: boolean })._subjectLinkFailed = true

  // Auto-link to Subject Bundle & Curriculum ONLY if marked as bundle
  if (input.isBundleOnly && course.subjectId) {
    linkCourseToSubjectBundleAndUnits(
      Number(course.subjectId),
      course.title,
      course.description,
      course.videoUrl,
      course.duration,
      course.thumbnail,
      course.instructor,
      course.level,
      Number(course.id)
    ).catch(err => console.warn('[courseService] linkCourseToSubjectBundleAndUnits background error:', err))
  } else if (input.isBundleOnly === false) {
    // If explicitly switched to individual, remove from subject_videos to prevent bundle duplication
    void supabase
      .from('subject_videos')
      .delete()
      .eq('course_id', id)
      .then(
        () => {},
        (err: unknown) => console.warn('[courseService] Cleanup from subject_videos failed:', err)
      )
  }

  return course
}

// ─── Delete Course ────────────────────────────────────────────────────────────
export async function deleteSiteCourse(id: string): Promise<void> {
  const { data: course } = await supabase
    .from('site_courses')
    .select('thumbnail_url, video_url')
    .eq('id', id)
    .single()

  if (course?.thumbnail_url) await deleteCourseFile(course.thumbnail_url).catch(() => {})
  if (course?.video_url) await deleteCourseFile(course.video_url).catch(() => {})

  const { error } = await supabase.from('site_courses').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete course: ${error.message}`)
}

// ─── Toggle Status ────────────────────────────────────────────────────────────
export async function toggleSiteCourseStatus(id: string, currentStatus: string): Promise<Course> {
  const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published'
  return updateSiteCourse(id, { status: newStatus as 'Published' | 'Draft' })
}

// ─── Storage: Thumbnail Upload (bucket: course-thumbnails) ─────────────────
export async function uploadCourseThumbnail(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from('course-thumbnails')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) throw new Error(`Failed to upload thumbnail: ${error.message}`)

  const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(path)
  return data.publicUrl
}

// ─── Storage: Course Video Upload (Backblaze B2) ───────────────────────────
export async function uploadCourseVideo(file: File, path: string, onProgress?: (percent: number) => void): Promise<string> {
  return uploadToBackblaze(file, `courses/${path}`, onProgress)
}

// ─── Storage: Delete a course file (thumbnail or video) by its public URL ──
export async function deleteCourseFile(fileUrl: string): Promise<void> {
  if (isBackblazeRef(fileUrl)) {
    await deleteBackblazeFile(fileUrl)
    return
  }
  const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (!storageMatch) return
  const [, bucket, path] = storageMatch

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.error(`Failed to delete course file from Storage: ${error.message}`)
}
