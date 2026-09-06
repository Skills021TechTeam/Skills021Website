// ============================================================================
// Skills021 — Resource Bundle Types
// ============================================================================

export type ResourceBundlePlan = 'six_month' | 'lifetime'

export interface ResourceBundleItem {
  id: string
  bundleId: string
  resourceId: number
  sortOrder: number
  createdAt: string
  // Embedded resource details
  title?: string
  description?: string
  fileUrl?: string
  thumbnailUrl?: string
  author?: string
  typeName?: string
  resourceType?: string
  isPremium?: boolean
  downloads?: number
  price?: number
}

export interface ResourceBundle {
  id: string
  subjectId: number
  title: string
  description: string
  sixMonthPrice: number
  lifetimePrice: number
  sixMonthEnabled: boolean
  lifetimeEnabled: boolean
  isActive: boolean
  createdBy?: string | null
  createdAt: string
  updatedAt: string

  // Academic hierarchy context
  subjectName?: string
  subjectCode?: string
  semesterNumber?: number
  branchName?: string
  courseName?: string
  collegeName?: string

  // Included items
  items?: ResourceBundleItem[]
  itemCount?: number

  // Admin summary stats
  totalPurchasers?: number
  activePurchasers?: number
  revenue?: number
}

export interface CreateResourceBundleInput {
  subjectId: number
  title: string
  description?: string
  sixMonthPrice: number
  lifetimePrice: number
  sixMonthEnabled?: boolean
  lifetimeEnabled?: boolean
  isActive?: boolean
  resourceIds?: number[]
}

export interface UpdateResourceBundleInput {
  title?: string
  description?: string
  sixMonthPrice?: number
  lifetimePrice?: number
  sixMonthEnabled?: boolean
  lifetimeEnabled?: boolean
  isActive?: boolean
  resourceIds?: number[]
}

export interface ResourceBundlePurchase {
  id: string
  userId: string
  bundleId: string
  subjectId: number
  enrollmentId?: string | null
  planType: ResourceBundlePlan
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

  // User metadata for admin view
  userEmail?: string
  userName?: string
  utrNumber?: string
  screenshotUrl?: string
}

export interface ResourceBundleAccess {
  hasAccess: boolean
  planType?: ResourceBundlePlan
  startsAt?: string | null
  expiresAt?: string | null
  isLifetime?: boolean
  isPending?: boolean
  hasPending?: boolean
  isExpired?: boolean
  isPremiumPass?: boolean
  purchaseId?: string
  bundleId?: string
}
