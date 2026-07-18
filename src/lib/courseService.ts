import { supabase } from './supabase'
import type { Course, CourseGroup, CourseSubcategory } from '../store/contentStore'

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
}

const COURSE_SELECT = `
  id, title, description, course_group, subcategory, instructor, duration,
  lectures, level, rating, reviews, is_free, price, tags, thumbnail_url,
  video_url, status, enrolled, gradient_from, gradient_to, created_at, updated_at
`

// ─── Map DB row → Frontend Course ───────────────────────────────────────────
function mapRowToCourse(row: SiteCourseRow): Course {
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
    tags: row.tags ?? [],
    thumbnail: row.thumbnail_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    modules: [],
    status: (row.status ?? 'Draft') as Course['status'],
    enrolled: row.enrolled ?? 0,
    gradientFrom: row.gradient_from ?? '#6C63FF',
    gradientTo: row.gradient_to ?? '#00BFA6',
    createdAt: row.created_at ?? '',
  }
}

// ─── Fetch Published Courses (public /courses page) ─────────────────────────
export async function fetchPublishedSiteCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('site_courses')
    .select(COURSE_SELECT)
    .eq('status', 'Published')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch courses: ${error.message}`)
  return ((data ?? []) as unknown as SiteCourseRow[]).map(mapRowToCourse)
}

// ─── Fetch All Courses (Admin) ───────────────────────────────────────────────
export async function fetchAllSiteCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('site_courses')
    .select(COURSE_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch courses: ${error.message}`)
  return ((data ?? []) as unknown as SiteCourseRow[]).map(mapRowToCourse)
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
}

export async function createSiteCourse(input: CreateSiteCourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from('site_courses')
    .insert({
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
      tags: input.tags ?? [],
      thumbnail_url: input.thumbnailUrl || null,
      video_url: input.videoUrl || null,
      status: input.status,
      enrolled: 0,
      rating: 4.5,
      reviews: 0,
      gradient_from: input.gradientFrom ?? '#6C63FF',
      gradient_to: input.gradientTo ?? '#00BFA6',
    })
    .select(COURSE_SELECT)
    .single()

  if (error) throw new Error(`Failed to create course: ${error.message}`)
  return mapRowToCourse(data as unknown as SiteCourseRow)
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
  if (input.tags !== undefined) payload.tags = input.tags
  if (input.thumbnailUrl !== undefined) payload.thumbnail_url = input.thumbnailUrl
  if (input.videoUrl !== undefined) payload.video_url = input.videoUrl
  if (input.status !== undefined) payload.status = input.status
  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('site_courses')
    .update(payload)
    .eq('id', id)
    .select(COURSE_SELECT)
    .single()

  if (error) throw new Error(`Failed to update course: ${error.message}`)
  return mapRowToCourse(data as unknown as SiteCourseRow)
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
