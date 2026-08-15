import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ApplicationType = 'Job' | 'Internship'
export type ApplicationStatus = 'New' | 'In Review' | 'Shortlisted' | 'Rejected' | 'Hired'

export interface CareerApplication {
  id: string
  applicationType: ApplicationType
  fullName: string
  email: string
  phone: string
  role: string
  department: string
  collegeOrOrganization: string
  experienceLevel: string
  portfolioUrl: string
  resumeUrl: string
  coverMessage: string
  status: ApplicationStatus
  createdAt: string
}

interface CareerApplicationRow {
  id: string
  application_type: string
  full_name: string
  email: string
  phone: string
  role: string
  department: string
  college_or_organization: string
  experience_level: string
  portfolio_url: string
  resume_url: string
  cover_message: string
  status: string
  created_at: string
}

const mapCareerApplication = (r: CareerApplicationRow): CareerApplication => ({
  id: r.id,
  applicationType: (r.application_type ?? 'Job') as ApplicationType,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone ?? '',
  role: r.role ?? '',
  department: r.department ?? '',
  collegeOrOrganization: r.college_or_organization ?? '',
  experienceLevel: r.experience_level ?? '',
  portfolioUrl: r.portfolio_url ?? '',
  resumeUrl: r.resume_url ?? '',
  coverMessage: r.cover_message ?? '',
  status: (r.status ?? 'New') as ApplicationStatus,
  createdAt: r.created_at,
})

// ─── Submit application (public form) ───────────────────────────────────────
export interface CareerApplicationInput {
  applicationType: ApplicationType
  fullName: string
  email: string
  phone: string
  role: string
  department: string
  collegeOrOrganization: string
  experienceLevel: string
  portfolioUrl: string
  resumeUrl: string
  coverMessage: string
}

export async function submitCareerApplication(input: CareerApplicationInput): Promise<CareerApplication> {
  const { data, error } = await supabase
    .from('career_applications')
    .insert({
      application_type: input.applicationType,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      role: input.role,
      department: input.department,
      college_or_organization: input.collegeOrOrganization,
      experience_level: input.experienceLevel,
      portfolio_url: input.portfolioUrl,
      resume_url: input.resumeUrl,
      cover_message: input.coverMessage,
      status: 'New',
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to submit application: ${error.message}`)
  return mapCareerApplication(data as unknown as CareerApplicationRow)
}

// ─── Storage: Resume Upload (bucket: resumes) ───────────────────────────────
export async function uploadResume(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from('resumes')
    // Explicit contentType (rather than letting it fall back to a generic
    // binary type) is what lets the Admin dashboard preview PDFs inline in
    // an <iframe> instead of the browser being forced to download them.
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || undefined })

  if (error) throw new Error(`Failed to upload resume: ${error.message}`)

  const { data } = supabase.storage.from('resumes').getPublicUrl(path)
  return data.publicUrl
}

// ─── Fetch All Applications (Admin) ─────────────────────────────────────────
export async function fetchAllCareerApplications(): Promise<CareerApplication[]> {
  const { data, error } = await supabase
    .from('career_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch applications: ${error.message}`)
  return ((data ?? []) as unknown as CareerApplicationRow[]).map(mapCareerApplication)
}

// ─── Update Application Status (Admin) ──────────────────────────────────────
export async function updateCareerApplicationStatus(id: string, status: ApplicationStatus): Promise<CareerApplication> {
  const { data, error } = await supabase
    .from('career_applications')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update application: ${error.message}`)
  return mapCareerApplication(data as unknown as CareerApplicationRow)
}

// ─── Delete Application (Admin) ─────────────────────────────────────────────
export async function deleteCareerApplication(id: string): Promise<void> {
  const { error } = await supabase.from('career_applications').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete application: ${error.message}`)
}
