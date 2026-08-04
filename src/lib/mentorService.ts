import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
export type MentorshipServiceType =
  | 'One-to-One Mentorship' | 'Career Guidance' | 'Resume Review'
  | 'LinkedIn Profile Review' | 'Mock Interview' | 'Placement Preparation' | 'Study Roadmap'

export interface Mentor {
  id: string
  name: string
  designation: string
  company: string
  expertise: string[]
  experience: string
  rating: number
  reviews: number
  sessions: number
  photo?: string
  bio: string
  services: MentorshipServiceType[]
  fees: Record<string, number>
  linkedIn?: string
  status: 'Active' | 'Inactive'
  createdAt: string
}

export type GuidanceRequestStatus = 'New' | 'In Progress' | 'Contacted' | 'Completed'

export interface GuidanceRequest {
  id: string
  fullName: string
  mobile: string
  whatsapp: string
  email: string
  city: string
  state: string
  classYear: string
  schoolCollege: string
  boardUniversity: string
  stream: string
  percentage: string
  guidanceTypes: string[]
  preferredMentors: string[]
  additionalQuery: string
  status: GuidanceRequestStatus
  createdAt: string
}

export interface MentorSession {
  id: string
  studentName: string
  studentEmail: string
  mentorId: string
  serviceType: MentorshipServiceType
  date: string
  time: string
  duration: string
  fee: number
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  notes?: string
  createdAt: string
}

// ─── DB Row Shapes ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MentorRow {
  id: string; name: string; designation: string; company: string
  expertise: string[]; experience: string; rating: number; reviews: number
  sessions: number; photo: string | null; bio: string
  services: string[]; fees: Record<string, number>; linked_in: string | null
  status: string; created_at: string
}

interface SessionRow {
  id: string; student_name: string; student_email: string; mentor_id: string | null
  service_type: string; session_date: string; session_time: string; duration: string
  fee: number; status: string; notes: string | null; created_at: string
}

interface GuidanceRequestRow {
  id: string; full_name: string; mobile: string; whatsapp: string; email: string
  city: string; state: string; class_year: string; school_college: string
  board_university: string; stream: string; percentage: string
  guidance_types: string[]; preferred_mentors: string[]; additional_query: string
  status: string; created_at: string
}

const mapMentor = (r: MentorRow): Mentor => ({
  id: r.id,
  name: r.name,
  designation: r.designation ?? '',
  company: r.company ?? '',
  expertise: r.expertise ?? [],
  experience: r.experience ?? '',
  rating: r.rating ?? 5,
  reviews: r.reviews ?? 0,
  sessions: r.sessions ?? 0,
  photo: r.photo ?? undefined,
  bio: r.bio ?? '',
  services: (r.services ?? []) as MentorshipServiceType[],
  fees: r.fees ?? {},
  linkedIn: r.linked_in ?? undefined,
  status: (r.status ?? 'Active') as Mentor['status'],
  createdAt: r.created_at,
})

const mapSession = (r: SessionRow): MentorSession => ({
  id: r.id,
  studentName: r.student_name,
  studentEmail: r.student_email ?? '',
  mentorId: r.mentor_id ?? '',
  serviceType: (r.service_type ?? 'Career Guidance') as MentorshipServiceType,
  date: r.session_date ?? '',
  time: r.session_time ?? '',
  duration: r.duration ?? '',
  fee: r.fee ?? 0,
  status: (r.status ?? 'Pending') as MentorSession['status'],
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
})

const mapGuidanceRequest = (r: GuidanceRequestRow): GuidanceRequest => ({
  id: r.id,
  fullName: r.full_name,
  mobile: r.mobile ?? '',
  whatsapp: r.whatsapp ?? '',
  email: r.email ?? '',
  city: r.city ?? '',
  state: r.state ?? '',
  classYear: r.class_year ?? '',
  schoolCollege: r.school_college ?? '',
  boardUniversity: r.board_university ?? '',
  stream: r.stream ?? '',
  percentage: r.percentage ?? '',
  guidanceTypes: r.guidance_types ?? [],
  preferredMentors: r.preferred_mentors ?? [],
  additionalQuery: r.additional_query ?? '',
  status: (r.status ?? 'New') as GuidanceRequestStatus,
  createdAt: r.created_at,
})

// ─── Mentors ────────────────────────────────────────────────────────────────────
export async function fetchAllMentors(): Promise<Mentor[]> {
  const { data, error } = await supabase.from('mentors').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to fetch mentors: ${error.message}`)
  return ((data ?? []) as unknown as MentorRow[]).map(mapMentor)
}

export async function fetchActiveMentors(): Promise<Mentor[]> {
  const { data, error } = await supabase.from('mentors').select('*').eq('status', 'Active').order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to fetch mentors: ${error.message}`)
  return ((data ?? []) as unknown as MentorRow[]).map(mapMentor)
}

export interface MentorInput {
  name: string
  designation?: string
  company?: string
  expertise?: string[]
  experience?: string
  photo?: string
  bio?: string
  services?: MentorshipServiceType[]
  fees?: Record<string, number>
  linkedIn?: string
  status?: 'Active' | 'Inactive'
}

export async function createMentor(input: MentorInput): Promise<Mentor> {
  const { data, error } = await supabase
    .from('mentors')
    .insert({
      name: input.name,
      designation: input.designation || '',
      company: input.company || '',
      expertise: input.expertise ?? [],
      experience: input.experience || '',
      photo: input.photo || null,
      bio: input.bio || '',
      services: input.services ?? [],
      fees: input.fees ?? {},
      linked_in: input.linkedIn || null,
      status: input.status || 'Active',
      rating: 5,
      reviews: 0,
      sessions: 0,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Failed to create mentor: ${error.message}`)
  return mapMentor(data as unknown as MentorRow)
}

export async function updateMentor(id: string, input: Partial<MentorInput>): Promise<Mentor> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.designation !== undefined) payload.designation = input.designation
  if (input.company !== undefined) payload.company = input.company
  if (input.expertise !== undefined) payload.expertise = input.expertise
  if (input.experience !== undefined) payload.experience = input.experience
  if (input.photo !== undefined) payload.photo = input.photo
  if (input.bio !== undefined) payload.bio = input.bio
  if (input.services !== undefined) payload.services = input.services
  if (input.fees !== undefined) payload.fees = input.fees
  if (input.linkedIn !== undefined) payload.linked_in = input.linkedIn
  if (input.status !== undefined) payload.status = input.status

  const { data, error } = await supabase.from('mentors').update(payload).eq('id', id).select('*').single()
  if (error) throw new Error(`Failed to update mentor: ${error.message}`)
  return mapMentor(data as unknown as MentorRow)
}

export async function deleteMentor(id: string): Promise<void> {
  const { data: mentor } = await supabase.from('mentors').select('photo').eq('id', id).single()
  if (mentor?.photo) await deleteMentorPhoto(mentor.photo).catch(() => {})
  const { error } = await supabase.from('mentors').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete mentor: ${error.message}`)
}

export async function toggleMentorStatus(id: string, currentStatus: string): Promise<Mentor> {
  return updateMentor(id, { status: currentStatus === 'Active' ? 'Inactive' : 'Active' })
}

export async function uploadMentorPhoto(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from('mentor-photos').upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw new Error(`Failed to upload photo: ${error.message}`)
  const { data } = supabase.storage.from('mentor-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteMentorPhoto(fileUrl: string): Promise<void> {
  const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
  if (!match) return
  const [, bucket, path] = match
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.error(`Failed to delete mentor photo: ${error.message}`)
}

// ─── Sessions ────────────────────────────────────────────────────────────────────
export async function fetchAllSessions(): Promise<MentorSession[]> {
  const { data, error } = await supabase.from('mentor_sessions').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`)
  return ((data ?? []) as unknown as SessionRow[]).map(mapSession)
}

export interface SessionInput {
  studentName: string
  studentEmail?: string
  mentorId: string
  serviceType: MentorshipServiceType
  date: string
  time?: string
  duration?: string
  fee?: number
  status?: MentorSession['status']
  notes?: string
}

export async function createSession(input: SessionInput): Promise<MentorSession> {
  const { data, error } = await supabase
    .from('mentor_sessions')
    .insert({
      student_name: input.studentName,
      student_email: input.studentEmail || '',
      mentor_id: input.mentorId || null,
      service_type: input.serviceType,
      session_date: input.date,
      session_time: input.time || '',
      duration: input.duration || '',
      fee: input.fee ?? 0,
      status: input.status || 'Pending',
      notes: input.notes || '',
    })
    .select('*')
    .single()
  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return mapSession(data as unknown as SessionRow)
}

export async function updateSession(id: string, input: Partial<SessionInput>): Promise<MentorSession> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {}
  if (input.studentName !== undefined) payload.student_name = input.studentName
  if (input.studentEmail !== undefined) payload.student_email = input.studentEmail
  if (input.mentorId !== undefined) payload.mentor_id = input.mentorId
  if (input.serviceType !== undefined) payload.service_type = input.serviceType
  if (input.date !== undefined) payload.session_date = input.date
  if (input.time !== undefined) payload.session_time = input.time
  if (input.duration !== undefined) payload.duration = input.duration
  if (input.fee !== undefined) payload.fee = input.fee
  if (input.status !== undefined) payload.status = input.status
  if (input.notes !== undefined) payload.notes = input.notes

  const { data, error } = await supabase.from('mentor_sessions').update(payload).eq('id', id).select('*').single()
  if (error) throw new Error(`Failed to update session: ${error.message}`)
  return mapSession(data as unknown as SessionRow)
}

export async function updateSessionStatus(id: string, status: MentorSession['status']): Promise<MentorSession> {
  return updateSession(id, { status })
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('mentor_sessions').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete session: ${error.message}`)
}

// ─── Guidance Requests ─────────────────────────────────────────────────────────
export async function fetchAllGuidanceRequests(): Promise<GuidanceRequest[]> {
  const { data, error } = await supabase.from('guidance_requests').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to fetch guidance requests: ${error.message}`)
  return ((data ?? []) as unknown as GuidanceRequestRow[]).map(mapGuidanceRequest)
}

export interface GuidanceRequestInput {
  fullName: string
  mobile: string
  whatsapp: string
  email: string
  city: string
  state: string
  classYear: string
  schoolCollege: string
  boardUniversity: string
  stream: string
  percentage: string
  guidanceTypes: string[]
  preferredMentors: string[]
  additionalQuery: string
}

export async function createGuidanceRequest(input: GuidanceRequestInput): Promise<GuidanceRequest> {
  const { data, error } = await supabase
    .from('guidance_requests')
    .insert({
      full_name: input.fullName,
      mobile: input.mobile,
      whatsapp: input.whatsapp,
      email: input.email,
      city: input.city,
      state: input.state,
      class_year: input.classYear,
      school_college: input.schoolCollege,
      board_university: input.boardUniversity,
      stream: input.stream,
      percentage: input.percentage,
      guidance_types: input.guidanceTypes,
      preferred_mentors: input.preferredMentors,
      additional_query: input.additionalQuery,
      status: 'New',
    })
    .select('*')
    .single()
  if (error) throw new Error(`Failed to submit guidance request: ${error.message}`)
  return mapGuidanceRequest(data as unknown as GuidanceRequestRow)
}

export async function updateGuidanceRequestStatus(id: string, status: GuidanceRequestStatus): Promise<GuidanceRequest> {
  const { data, error } = await supabase.from('guidance_requests').update({ status }).eq('id', id).select('*').single()
  if (error) throw new Error(`Failed to update guidance request: ${error.message}`)
  return mapGuidanceRequest(data as unknown as GuidanceRequestRow)
}

export async function deleteGuidanceRequest(id: string): Promise<void> {
  const { error } = await supabase.from('guidance_requests').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete guidance request: ${error.message}`)
}
