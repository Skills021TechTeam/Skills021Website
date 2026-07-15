import type { LucideIcon } from 'lucide-react'

export type ExamType = 'Government' | 'Private' | 'National' | 'State'
export type RegistrationStatus = 'Open' | 'Closing Soon' | 'Upcoming' | 'Closed'

export interface Career {
  id: string
  title: string
  shortDescription: string
  description: string
  averageSalary: string
  careerGrowth: string
  requiredSkills: string[]
  educationRequired: string
  eligibilityOverview: string
  industriesHiring: string[]
  futureScope: string
  icon: LucideIcon
  accent: string
  relatedCareerIds: string[]
}

export interface Exam {
  id: string
  name: string
  conductingOrganization: string
  registrationStartDate: string
  registrationEndDate: string
  examDate: string
  resultDate: string
  eligibilitySummary: string
  applicationFee: string
  selectionProcess: string
  status: RegistrationStatus
  type: ExamType
  officialWebsite: string
}

export interface CareerExamMapping {
  careerId: string
  examId: string
  isEligible: boolean
}

export type SortOption =
  | 'Nearest Registration Deadline'
  | 'Upcoming Exam Date'
  | 'Highest Salary'
  | 'Alphabetical'

