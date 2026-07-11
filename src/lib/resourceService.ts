import { supabase } from './supabase'
import type { Resource } from '../store/contentStore'

// ─── Hierarchy entity types ─────────────────────────────────────────────────
export interface College  { id: number; name: string; short_name: string | null; city: string | null; state: string | null }
export interface Course   { id: number; college_id: number; name: string; duration: string | null }
export interface Branch   { id: number; course_id: number; name: string; code: string | null }
export interface Semester { id: number; branch_id: number; semester_number: number }
export interface Subject  { id: number; semester_id: number; name: string; code: string | null }
export interface ResourceTypeRow { id: number; name: string }

// ─── Hierarchy Lookup Functions ─────────────────────────────────────────────

export async function fetchColleges(): Promise<College[]> {
  const { data, error } = await supabase.from('colleges').select('*').order('name')
  if (error) throw new Error(`Failed to fetch colleges: ${error.message}`)
  return data as College[]
}

export async function fetchCourses(collegeId: number): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select('*').eq('college_id', collegeId).order('name')
  if (error) throw new Error(`Failed to fetch courses: ${error.message}`)
  return data as Course[]
}

export async function fetchBranches(courseId: number): Promise<Branch[]> {
  const { data, error } = await supabase.from('branches').select('*').eq('course_id', courseId).order('name')
  if (error) throw new Error(`Failed to fetch branches: ${error.message}`)
  return data as Branch[]
}

export async function fetchSemesters(branchId: number): Promise<Semester[]> {
  const { data, error } = await supabase.from('semesters').select('*').eq('branch_id', branchId).order('semester_number')
  if (error) throw new Error(`Failed to fetch semesters: ${error.message}`)
  return data as Semester[]
}

export async function fetchSubjects(semesterId: number): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('*').eq('semester_id', semesterId).order('name')
  if (error) throw new Error(`Failed to fetch subjects: ${error.message}`)
  return data as Subject[]
}

export async function fetchResourceTypes(): Promise<ResourceTypeRow[]> {
  const { data, error } = await supabase.from('resource_types').select('*').order('name')
  if (error) throw new Error(`Failed to fetch resource types: ${error.message}`)
  return data as ResourceTypeRow[]
}

// ─── Relational select string (used for both published + all) ───────────────
const RESOURCE_SELECT = `
  id, title, description, file_url, thumbnail_url, author,
  is_premium, price, downloads, status, created_at, updated_at,
  resource_types ( id, name ),
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

// ─── Map a joined DB row → Frontend Resource ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToResource(row: any): Resource {
  const subj = row.subjects
  const sem  = subj?.semesters
  const br   = sem?.branches
  const crs  = br?.courses
  const clg  = crs?.colleges

  return {
    id:           String(row.id),
    title:        row.title ?? '',
    description:  row.description ?? '',
    type:         row.resource_types?.name ?? '',
    college:      clg?.name ?? '',
    course:       crs?.name ?? '',
    branch:       br?.name ?? '',
    semester:     sem?.semester_number != null ? String(sem.semester_number) : '',
    subject:      subj?.name ?? '',
    collegeId:    clg?.id,
    courseId:     crs?.id,
    branchId:     br?.id,
    semesterId:   sem?.id,
    subjectId:    subj?.id,
    author:       row.author ?? '',
    lastUpdated:  row.updated_at ?? row.created_at ?? '',
    thumbnail:    row.thumbnail_url ?? undefined,
    downloadUrl:  row.file_url ?? undefined,
    isPremium:    row.is_premium ?? false,
    price:        row.price ?? undefined,
    status:       row.status ?? 'Draft',
    downloads:    row.downloads ?? 0,
    bookmarks:    0,
    createdAt:    row.created_at ?? '',
  }
}

// ─── Fetch Published Resources (Student page) ───────────────────────────────
export async function fetchPublishedResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('status', 'Published')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch published resources: ${error.message}`)
  return (data ?? []).map(mapRowToResource)
}

// ─── Fetch All Resources (Admin) ────────────────────────────────────────────
export async function fetchAllResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select(RESOURCE_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch resources: ${error.message}`)
  return (data ?? []).map(mapRowToResource)
}

// ─── Create Resource ────────────────────────────────────────────────────────
export interface CreateResourceInput {
  subjectId: number
  resourceTypeId: number
  title: string
  description: string
  fileUrl?: string
  thumbnailUrl?: string
  author: string
  isPremium: boolean
  price?: number
  status: 'Published' | 'Draft'
}

export async function createResource(input: CreateResourceInput): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .insert({
      subject_id:       input.subjectId,
      resource_type_id: input.resourceTypeId,
      title:            input.title,
      description:      input.description,
      file_url:         input.fileUrl || null,
      thumbnail_url:    input.thumbnailUrl || null,
      author:           input.author,
      is_premium:       input.isPremium,
      price:            input.isPremium ? (input.price ?? 0) : null,
      downloads:        0,
      status:           input.status,
    })
    .select(RESOURCE_SELECT)
    .single()

  if (error) throw new Error(`Failed to create resource: ${error.message}`)
  return mapRowToResource(data)
}

// ─── Update Resource ────────────────────────────────────────────────────────
export interface UpdateResourceInput {
  title?: string
  description?: string
  fileUrl?: string
  thumbnailUrl?: string
  author?: string
  isPremium?: boolean
  price?: number
  status?: 'Published' | 'Draft'
  subjectId?: number
  resourceTypeId?: number
}

export async function updateResource(id: string, input: UpdateResourceInput): Promise<Resource> {
  // Build the update payload — only include fields that are defined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {}
  if (input.title !== undefined)          payload.title = input.title
  if (input.description !== undefined)    payload.description = input.description
  if (input.fileUrl !== undefined)        payload.file_url = input.fileUrl
  if (input.thumbnailUrl !== undefined)   payload.thumbnail_url = input.thumbnailUrl
  if (input.author !== undefined)         payload.author = input.author
  if (input.isPremium !== undefined)      payload.is_premium = input.isPremium
  if (input.price !== undefined)          payload.price = input.price
  if (input.status !== undefined)         payload.status = input.status
  if (input.subjectId !== undefined)      payload.subject_id = input.subjectId
  if (input.resourceTypeId !== undefined) payload.resource_type_id = input.resourceTypeId

  const { data, error } = await supabase
    .from('resources')
    .update(payload)
    .eq('id', id)
    .select(RESOURCE_SELECT)
    .single()

  if (error) throw new Error(`Failed to update resource: ${error.message}`)
  return mapRowToResource(data)
}

// ─── Delete Resource ────────────────────────────────────────────────────────
export async function deleteResource(id: string): Promise<void> {
  // Query the file_url first so we can delete from storage
  const { data: resource } = await supabase
    .from('resources')
    .select('file_url')
    .eq('id', id)
    .single()

  if (resource?.file_url) {
    await deleteResourceFile(resource.file_url)
  }

  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete resource: ${error.message}`)
}

// ─── Toggle Resource Status ─────────────────────────────────────────────────
export async function toggleResourceStatus(id: string, currentStatus: string): Promise<Resource> {
  const newStatus = currentStatus === 'Published' ? 'Draft' : 'Published'
  return updateResource(id, { status: newStatus as 'Published' | 'Draft' })
}

// ─── Increment Download Count ───────────────────────────────────────────────
export async function incrementDownloadCount(resourceId: string, currentDownloads: number): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ downloads: currentDownloads + 1 })
    .eq('id', resourceId)

  if (error) {
    throw new Error(`Failed to update download count: ${error.message}`)
  }
}

// ─── Trigger File Download ──────────────────────────────────────────────────
// Detects Supabase Storage URLs and uses the download() API for them;
// falls back to window.open() for external URLs.
export async function triggerResourceDownload(fileUrl: string, fileName: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  // Check if this is a Supabase Storage URL
  const isSupabaseStorage =
    fileUrl.includes('/storage/v1/object/') ||
    (supabaseUrl && fileUrl.startsWith(supabaseUrl))

  if (isSupabaseStorage) {
    // Extract bucket and path from the URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)

    if (storageMatch) {
      const [, bucket, path] = storageMatch
      console.log(`[Download] Using Supabase Storage API — bucket: ${bucket}, path: ${path}`)

      const { data, error } = await supabase.storage.from(bucket).download(path)

      if (error) {
        console.error('[Download] Supabase Storage download failed:', error)
        throw new Error(`Storage download failed: ${error.message}`)
      }

      // Create a blob URL and trigger browser download
      const blobUrl = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(blobUrl)

      console.log(`[Download] Successfully downloaded via Storage API: ${fileName}`)
      return
    }
  }

  // Fallback: open in a new tab for non-Storage URLs
  console.log(`[Download] Opening URL in new tab: ${fileUrl}`)
  window.open(fileUrl, '_blank', 'noopener,noreferrer')
}

// ─── Hierarchy Detail Fetchers ──────────────────────────────────────────────

export async function fetchAllCoursesWithDetails(): Promise<any[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id, college_id, name, duration, created_at,
      colleges ( id, name )
    `)
    .order('name')
  if (error) throw new Error(`Failed to fetch courses: ${error.message}`)
  return data
}

export async function fetchAllBranchesWithDetails(): Promise<any[]> {
  const { data, error } = await supabase
    .from('branches')
    .select(`
      id, course_id, name, code, created_at,
      courses (
        id, name,
        colleges ( id, name )
      )
    `)
    .order('name')
  if (error) throw new Error(`Failed to fetch branches: ${error.message}`)
  return data
}

export async function fetchAllSemestersWithDetails(): Promise<any[]> {
  const { data, error } = await supabase
    .from('semesters')
    .select(`
      id, branch_id, semester_number, created_at,
      branches (
        id, name,
        courses (
          id, name,
          colleges ( id, name )
        )
      )
    `)
    .order('semester_number')
  if (error) throw new Error(`Failed to fetch semesters: ${error.message}`)
  return data
}

export async function fetchAllSubjectsWithDetails(): Promise<any[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select(`
      id, semester_id, name, code, created_at,
      semesters (
        id, semester_number,
        branches (
          id, name,
          courses (
            id, name,
            colleges ( id, name )
          )
        )
      )
    `)
    .order('name')
  if (error) throw new Error(`Failed to fetch subjects: ${error.message}`)
  return data
}

// ─── Colleges CRUD ──────────────────────────────────────────────────────────

export async function createCollege(college: Omit<College, 'id'>): Promise<College> {
  const { data, error } = await supabase.from('colleges').insert(college).select().single()
  if (error) throw new Error(`Failed to create college: ${error.message}`)
  return data as College
}

export async function updateCollege(id: number, college: Partial<Omit<College, 'id'>>): Promise<College> {
  const { data, error } = await supabase.from('colleges').update(college).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update college: ${error.message}`)
  return data as College
}

export async function deleteCollege(id: number): Promise<void> {
  const { error } = await supabase.from('colleges').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete college: ${error.message}`)
}

// ─── Courses CRUD ───────────────────────────────────────────────────────────

export async function createCourse(course: Omit<Course, 'id'>): Promise<Course> {
  const { data, error } = await supabase.from('courses').insert(course).select().single()
  if (error) throw new Error(`Failed to create course: ${error.message}`)
  return data as Course
}

export async function updateCourse(id: number, course: Partial<Omit<Course, 'id'>>): Promise<Course> {
  const { data, error } = await supabase.from('courses').update(course).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update course: ${error.message}`)
  return data as Course
}

export async function deleteCourse(id: number): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete course: ${error.message}`)
}

// ─── Branches CRUD ──────────────────────────────────────────────────────────

export async function createBranch(branch: Omit<Branch, 'id'>): Promise<Branch> {
  const { data, error } = await supabase.from('branches').insert(branch).select().single()
  if (error) throw new Error(`Failed to create branch: ${error.message}`)
  return data as Branch
}

export async function updateBranch(id: number, branch: Partial<Omit<Branch, 'id'>>): Promise<Branch> {
  const { data, error } = await supabase.from('branches').update(branch).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update branch: ${error.message}`)
  return data as Branch
}

export async function deleteBranch(id: number): Promise<void> {
  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete branch: ${error.message}`)
}

// ─── Semesters CRUD ─────────────────────────────────────────────────────────

export async function createSemester(semester: Omit<Semester, 'id'>): Promise<Semester> {
  const { data, error } = await supabase.from('semesters').insert(semester).select().single()
  if (error) throw new Error(`Failed to create semester: ${error.message}`)
  return data as Semester
}

export async function updateSemester(id: number, semester: Partial<Omit<Semester, 'id'>>): Promise<Semester> {
  const { data, error } = await supabase.from('semesters').update(semester).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update semester: ${error.message}`)
  return data as Semester
}

export async function deleteSemester(id: number): Promise<void> {
  const { error } = await supabase.from('semesters').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete semester: ${error.message}`)
}

// ─── Subjects CRUD ──────────────────────────────────────────────────────────

export async function createSubject(subject: Omit<Subject, 'id'>): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').insert(subject).select().single()
  if (error) throw new Error(`Failed to create subject: ${error.message}`)
  return data as Subject
}

export async function updateSubject(id: number, subject: Partial<Omit<Subject, 'id'>>): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').update(subject).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update subject: ${error.message}`)
  return data as Subject
}

export async function deleteSubject(id: number): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete subject: ${error.message}`)
}

// ─── Storage Operations ──────────────────────────────────────────────────────

export async function uploadResourceFile(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('resources')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    throw new Error(`Failed to upload file to Storage: ${error.message}`)
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('resources')
    .getPublicUrl(path)

  return publicUrlData.publicUrl
}

export async function deleteResourceFile(fileUrl: string): Promise<void> {
  // Extract path from the public URL
  const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (!storageMatch) return
  const [, bucket, path] = storageMatch
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error(`Failed to delete file from Storage: ${error.message}`)
  }
}
