// ============================================================================
// Skills021 — Semester Bundle Types
// ============================================================================
import type { SubjectBundle } from './subjectBundleTypes'

export type SemesterBundlePlan = 'six_month' | 'lifetime'

export interface SemesterBundleSubject {
  id: string
  bundleId: string
  subjectBundleId: string
  sortOrder: number
  isSemesterOnly?: boolean
  createdAt: string

  // Embedded subject bundle details
  subjectId?: number
  subjectName?: string
  subjectCode?: string
  sixMonthPrice?: number
  lifetimePrice?: number
  thumbnailUrl?: string
  rating?: number
  reviews?: number
  instructor?: string
  videoCount?: number
  resourceCount?: number
  unitCount?: number
  rawSubjectBundle?: SubjectBundle
}

export interface SemesterBundleSubjectMappingInput {
  subjectBundleId: string
  isSemesterOnly?: boolean
}

export interface SemesterBundle {
  id: string
  semesterId: number
  title: string
  description: string
  thumbnailUrl?: string
  sixMonthPrice: number
  lifetimePrice: number
  sixMonthEnabled: boolean
  lifetimeEnabled: boolean
  isActive: boolean
  createdBy?: string | null
  createdAt: string
  updatedAt: string

  // Academic hierarchy context (semester -> branch -> course -> college)
  semesterNumber?: number
  branchId?: number
  branchName?: string
  branchCode?: string
  academicCourseId?: number
  academicCourseName?: string
  collegeId?: number
  collegeName?: string

  // Mapped subjects and aggregated totals
  subjects?: SemesterBundleSubject[]
  subjectCount?: number
  totalVideos?: number
  totalResources?: number
  rating?: number
  reviews?: number

  // Admin purchase analytics
  totalPurchases?: number
  activePurchases?: number
  totalRevenue?: number
}

export interface CreateSemesterBundleInput {
  semesterId: number
  title: string
  description?: string
  thumbnailUrl?: string
  sixMonthPrice: number
  lifetimePrice: number
  sixMonthEnabled?: boolean
  lifetimeEnabled?: boolean
  isActive?: boolean
  subjectBundleIds?: string[]
  subjectBundleMappings?: SemesterBundleSubjectMappingInput[]
}

export interface UpdateSemesterBundleInput {
  title?: string
  description?: string
  thumbnailUrl?: string
  sixMonthPrice?: number
  lifetimePrice?: number
  sixMonthEnabled?: boolean
  lifetimeEnabled?: boolean
  isActive?: boolean
  subjectBundleIds?: string[]
  subjectBundleMappings?: SemesterBundleSubjectMappingInput[]
}

export interface SemesterBundleAccess {
  hasAccess: boolean
  isPending?: boolean
  hasPending?: boolean
  planType?: SemesterBundlePlan
  startsAt?: string | null
  expiresAt?: string | null
  isLifetime?: boolean
  purchaseId?: string
  bundleId?: string
  semesterId?: number
}

export interface SubmitSemesterBundlePaymentInput {
  bundleId: string
  semesterId: number
  semesterTitle: string
  planType: SemesterBundlePlan
  userId: string
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
