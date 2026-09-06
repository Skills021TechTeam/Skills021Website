// ============================================================================
// Skills021 — Subject Bundle Types
// Central TypeScript types for the Subject Bundle Purchase & Entitlement system.
// ============================================================================

export type SubjectBundlePlan = 'six_month' | 'lifetime'

export interface SubjectBundle {
  id: string
  subjectId: number
  title?: string
  sixMonthPrice: number
  lifetimePrice: number
  sixMonthEnabled: boolean
  lifetimeEnabled: boolean
  isActive: boolean
  createdBy?: string | null
  createdAt: string
  updatedAt: string

  // Academic hierarchy context (joined)
  subjectName?: string
  subjectCode?: string | null
  semesterNumber?: number
  branchName?: string
  academicCourseName?: string
  collegeName?: string

  // Visual & Feature presentation
  thumbnailUrl?: string
  description?: string | null
  rating?: number
  reviews?: number
  instructor?: string

  // Aggregates for Admin Dashboard and Public Cards
  totalPurchases?: number
  activePurchases?: number
  totalRevenue?: number
  videoCount?: number
  resourceCount?: number
  unitCount?: number
}

export interface CreateSubjectBundleInput {
  subjectId: number
  sixMonthPrice: number
  lifetimePrice: number
  sixMonthEnabled: boolean
  lifetimeEnabled: boolean
  isActive: boolean
  thumbnailUrl?: string
  description?: string | null
}

export interface UpdateSubjectBundleInput {
  sixMonthPrice?: number
  lifetimePrice?: number
  sixMonthEnabled?: boolean
  lifetimeEnabled?: boolean
  isActive?: boolean
  thumbnailUrl?: string
  description?: string | null
}

export interface SubjectUnit {
  id: string
  subjectId: number
  unitNumber: number
  title: string
  description?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  videos?: SubjectVideo[]
  resources?: SubjectUnitResource[]
}

export interface CreateSubjectUnitInput {
  subjectId: number
  unitNumber: number
  title: string
  description?: string
  sortOrder?: number
}

export interface UpdateSubjectUnitInput {
  unitNumber?: number
  title?: string
  description?: string
  sortOrder?: number
}

export interface SubjectVideo {
  id: string
  subjectId: number
  unitId?: string | null
  title: string
  description?: string
  videoUrl: string
  duration?: string
  thumbnailUrl?: string
  instructor?: string
  rating?: number
  reviews?: number
  level?: string
  courseId?: string | number
  sortOrder: number
  isFreePreview: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSubjectVideoInput {
  subjectId: number
  unitId?: string | null
  title: string
  description?: string
  videoUrl: string
  duration?: string
  thumbnailUrl?: string
  instructor?: string
  rating?: number
  reviews?: number
  level?: string
  courseId?: string | number
  sortOrder?: number
  isFreePreview?: boolean
}

export interface UpdateSubjectVideoInput {
  unitId?: string | null
  title?: string
  description?: string
  videoUrl?: string
  duration?: string
  thumbnailUrl?: string
  instructor?: string
  rating?: number
  reviews?: number
  level?: string
  courseId?: string | number
  sortOrder?: number
  isFreePreview?: boolean
}

export interface SubjectUnitResource {
  id: string
  title: string
  description?: string
  fileUrl?: string
  thumbnailUrl?: string
  author?: string
  isPremium: boolean
  price?: number
  downloads: number
  status: string
  typeName?: string
  unitId?: string | null
  subjectId?: number
}

export interface SubjectBundlePurchase {
  id: string
  userId: string
  bundleId: string
  subjectId: number
  enrollmentId?: string | null
  planType: SubjectBundlePlan
  originalAmount: number
  productDiscountAmount: number
  couponCode?: string | null
  couponDiscountAmount: number
  finalAmount: number
  paymentStatus: 'pending' | 'paid' | 'rejected'
  purchasedAt: string
  startsAt?: string | null
  expiresAt?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  status: 'pending' | 'active' | 'expired' | 'revoked'
  createdAt: string
  updatedAt: string

  // Joined metadata
  userEmail?: string
  userName?: string
  subjectName?: string
  utrNumber?: string
  screenshotUrl?: string
}

export interface SubjectBundleAccess {
  hasAccess: boolean
  purchaseId?: string
  planType?: SubjectBundlePlan
  paymentStatus?: 'pending' | 'paid' | 'rejected'
  status?: 'pending' | 'active' | 'expired' | 'revoked'
  startsAt?: string | null
  expiresAt?: string | null
  isExpired?: boolean
  daysLeft?: number | null
  hasPending?: boolean
  isPremiumPass?: boolean
}
