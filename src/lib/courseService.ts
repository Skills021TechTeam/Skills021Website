import { supabase } from './supabase'
import type { Course, CourseGroup, CourseSubcategory } from '../store/contentStore'

// A linked "Notes" subject is stored as a hidden entry inside the existing
// `tags` column (e.g. "__notes:Data Structures") instead of a new database
// column — this keeps course ⇄ notes linking working with zero schema changes.
const NOTES_TAG_PREFIX = '__notes:'
const encodeNotesTag = (subject: string) => `${NOTES_TAG_PREFIX}${subject}`
const isNotesTag = (t: string) => t.startsWith(NOTES_TAG_PREFIX)
const stripNotesTags = (tags: string[] | null | undefined) => (tags ?? []).filter(t => !isNotesTag(t))
const extractNotesSubject = (tags: string[] | null | undefined) =>
  (tags ?? []).find(isNotesTag)?.slice(NOTES_TAG_PREFIX.length) ?? ''

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subjects?: any
}

const COURSE_SELECT = `
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
    /relationship|schema cache|column .* does not exist|subject_id/i.test(message)

  let { data, error } = await build(COURSE_SELECT)
  if (error && isSchemaIssue(error.message)) {
    console.warn('[courseService] Falling back without subjects join — run the academic hierarchy migration to enable it:', error.message)
    ;({ data, error } = await build(COURSE_SELECT_NO_JOIN))
  }
  if (error && isSchemaIssue(error.message)) {
    console.warn('[courseService] Falling back without subject_id column — the academic hierarchy migration has not been run yet:', error.message)
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
    tags: stripNotesTags(row.tags),
    thumbnail: row.thumbnail_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    modules: [],
    status: (row.status ?? 'Draft') as Course['status'],
    enrolled: row.enrolled ?? 0,
    gradientFrom: row.gradient_from ?? '#6C63FF',
    gradientTo: row.gradient_to ?? '#00BFA6',
    createdAt: row.created_at ?? '',
    notesSubject: extractNotesSubject(row.tags),
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
}

export async function createSiteCourse(input: CreateSiteCourseInput): Promise<Course> {
  const basePayload = {
    title: input.title,
    description: input.description,
    course_group: input.group,
    subcategory: input.subcategory,
    instructor: input.instructor || 'Skills021 Team',
    duration: input.duration,
    lectures: input.lectures ?? 0,
    level: input.level,
    is_free: input.isFree,
    price: input.isFree ? 0 : (input.price ?? 0),
    tags: [...stripNotesTags(input.tags), ...(input.notesSubject?.trim() ? [encodeNotesTag(input.notesSubject.trim())] : [])],
    thumbnail_url: input.thumbnailUrl || null,
    video_url: input.videoUrl || null,
    status: input.status,
    enrolled: 0,
    rating: 4.5,
    reviews: 0,
    gradient_from: input.gradientFrom ?? '#6C63FF',
    gradient_to: input.gradientTo ?? '#00BFA6',
  }

  let { data, error } = await supabase
    .from('site_courses')
    .insert({ ...basePayload, subject_id: input.subjectId || null })
    .select(COURSE_SELECT)
    .single()

  // The subject_id column/FK doesn't exist yet, or isn't visible in
  // PostgREST's schema cache — retry without it so course creation still
  // works; only the hierarchy link is skipped. We flag this on the return
  // value (rather than only logging) so the Admin UI can warn the user
  // that the College/Course/Branch/Semester/Subject assignment they picked
  // did NOT actually get saved — otherwise it fails silently and the
  // Courses page academic filter later won't find these courses.
  let subjectLinkFailed = false
  if (error && isCourseSchemaIssue(error.message)) {
    console.warn('[courseService] Creating course without subject_id — run the academic hierarchy migration to enable it:', error.message)
    subjectLinkFailed = !!input.subjectId
    ;({ data, error } = await supabase
      .from('site_courses')
      .insert(basePayload)
      .select(COURSE_SELECT_LEGACY)
      .single())
  }

  if (error) throw new Error(`Failed to create course: ${error.message}`)
  const course = mapRowToCourse(data as unknown as SiteCourseRow)
  if (subjectLinkFailed) (course as Course & { _subjectLinkFailed?: boolean })._subjectLinkFailed = true
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
  if (input.isFree !== undefined) payload.is_free = input.isFree
  if (input.price !== undefined) payload.price = input.price
  if (input.tags !== undefined || input.notesSubject !== undefined) {
    payload.tags = [
      ...stripNotesTags(input.tags ?? []),
      ...(input.notesSubject?.trim() ? [encodeNotesTag(input.notesSubject.trim())] : []),
    ]
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

  // Same graceful fallback as createSiteCourse — retry without subject_id
  // if the migration hasn't been run yet, or the FK isn't in the schema
  // cache yet. Flag it on the return value so the caller can warn the user
  // instead of showing a plain "Course updated!" while the hierarchy pick
  // silently didn't save.
  let subjectLinkFailed = false
  if (error && isCourseSchemaIssue(error.message)) {
    console.warn('[courseService] Updating course without subject_id — run the academic hierarchy migration to enable it:', error.message)
    subjectLinkFailed = 'subject_id' in payload
    const { subject_id: _drop, ...payloadWithoutSubject } = payload
    ;({ data, error } = await supabase
      .from('site_courses')
      .update(payloadWithoutSubject)
      .eq('id', id)
      .select(COURSE_SELECT_LEGACY)
      .single())
  }

  if (error) throw new Error(`Failed to update course: ${error.message}`)
  const course = mapRowToCourse(data as unknown as SiteCourseRow)
  if (subjectLinkFailed) (course as Course & { _subjectLinkFailed?: boolean })._subjectLinkFailed = true
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

// ─── Storage: Video Upload (bucket: course-videos) ──────────────────────────
export async function uploadCourseVideo(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from('course-videos')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) throw new Error(`Failed to upload video: ${error.message}`)

  const { data } = supabase.storage.from('course-videos').getPublicUrl(path)
  return data.publicUrl
}

// ─── Storage: Delete a course file (thumbnail or video) by its public URL ──
export async function deleteCourseFile(fileUrl: string): Promise<void> {
  const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (!storageMatch) return
  const [, bucket, path] = storageMatch

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.error(`Failed to delete course file from Storage: ${error.message}`)
}
