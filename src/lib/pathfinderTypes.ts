export type PathFinderExamType = 'Government' | 'Private' | 'National' | 'State'
export type PathFinderExamStatus = 'Open' | 'Closing Soon' | 'Upcoming' | 'Closed'

export interface CareerPath {
  id: string
  icon: string | null
  title: string
  short_description: string
  full_description: string | null
  average_salary: string | null
  career_growth: string | null
  education_required: string | null
  required_skills: string[] | null
  industries: string[] | null
  future_scope: string | null
  created_at: string
  updated_at?: string | null
}

export type CareerPathRow = CareerPath

export interface CareerPathInput {
  icon?: string | null
  title: string
  short_description: string
  full_description?: string | null
  average_salary?: string | null
  career_growth?: string | null
  education_required?: string | null
  required_skills?: string[] | null
  industries?: string[] | null
  future_scope?: string | null
}

export interface Exam {
  id: string
  title: string
  conducting_body: string
  description: string | null
  exam_type: PathFinderExamType
  official_website: string | null
  registration_start: string | null
  registration_end: string | null
  exam_date: string | null
  result_date: string | null
  application_fee: number | null
  selection_process: string | null
  eligibility: string | null
  course: string | null
  branch: string | null
  minimum_semester: number | null
  maximum_age: number | null
  minimum_percentage: number | null
  average_salary: string | null
  status: PathFinderExamStatus
  created_at: string
  updated_at?: string | null
}

export type ExamRow = Exam

export interface ExamInput {
  title: string
  conducting_body: string
  description?: string | null
  exam_type: PathFinderExamType
  official_website?: string | null
  registration_start?: string | null
  registration_end?: string | null
  exam_date?: string | null
  result_date?: string | null
  application_fee?: number | null
  selection_process?: string | null
  eligibility?: string | null
  course?: string | null
  branch?: string | null
  minimum_semester?: number | null
  maximum_age?: number | null
  minimum_percentage?: number | null
  average_salary?: string | null
  status: PathFinderExamStatus
}

export interface CareerMappingRow {
  id: string
  career_path_id: string
  exam_ids: string[]
  relation_ids?: string[]
  career_paths?: Pick<CareerPathRow, 'id' | 'title'>
  exams?: Pick<ExamRow, 'id' | 'title'>[]
}

export interface CareerMappingInput {
  career_path_id: string
  exam_ids: string[]
}

export interface CareerPathExam {
  id: string
  career_path_id: string
  exam_id: string
  priority: number
}

