// ============================================================================
// Skills021 — Pricing Types
// Central TypeScript definitions for the Pricing, Discounts & Coupons system.
// ============================================================================

export type ProductType = 'course' | 'resource' | 'premium_membership'
export type DiscountType = 'percentage' | 'fixed'

// ─── Product Discount ────────────────────────────────────────────────────────
export interface ProductDiscount {
  id: string
  productType: ProductType
  productId: string
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount: number | null
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProductDiscountInput {
  productType: ProductType
  productId: string
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount?: number | null
  startsAt?: string | null
  expiresAt?: string | null
  isActive?: boolean
}

export interface UpdateProductDiscountInput {
  discountType?: DiscountType
  discountValue?: number
  maxDiscountAmount?: number | null
  startsAt?: string | null
  expiresAt?: string | null
  isActive?: boolean
}

// ─── Coupon ──────────────────────────────────────────────────────────────────
export interface Coupon {
  id: string
  code: string
  description: string
  discountType: DiscountType
  discountValue: number
  minimumOrderAmount: number
  maximumDiscountAmount: number | null
  allowOnDiscounted: boolean
  startsAt: string | null
  expiresAt: string | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
  /** Derived: computed client-side from current date + fields above */
  status?: CouponStatus
  /** Optionally loaded products */
  products?: CouponProduct[]
}

export type CouponStatus = 'Scheduled' | 'Active' | 'Expired' | 'Disabled' | 'Exhausted'

export interface CreateCouponInput {
  code: string
  description?: string
  discountType: DiscountType
  discountValue: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number | null
  allowOnDiscounted?: boolean
  startsAt?: string | null
  expiresAt?: string | null
  usageLimit?: number | null
  perUserLimit?: number | null
  isActive?: boolean
  products?: { productType: ProductType; productId: string }[]
}

export interface UpdateCouponInput {
  description?: string
  discountType?: DiscountType
  discountValue?: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number | null
  allowOnDiscounted?: boolean
  startsAt?: string | null
  expiresAt?: string | null
  usageLimit?: number | null
  perUserLimit?: number | null
  isActive?: boolean
  products?: { productType: ProductType; productId: string }[]
}

// ─── Coupon Product (restriction) ────────────────────────────────────────────
export interface CouponProduct {
  id: string
  couponId: string
  productType: ProductType
  productId: string
  createdAt: string
}

// ─── Coupon Redemption ────────────────────────────────────────────────────────
export interface CouponRedemption {
  id: string
  couponId: string
  couponCode?: string
  userId: string
  userEmail?: string
  userName?: string
  enrollmentId: string | null
  productType: ProductType
  productId: string
  productTitle?: string
  discountAmount: number
  originalAmount: number
  finalAmount: number
  redeemedAt: string
}

// ─── Pricing Breakdown ────────────────────────────────────────────────────────
export interface PricingBreakdown {
  originalPrice: number
  productDiscountAmount: number
  discountedPrice: number
  couponDiscountAmount: number
  couponCode: string | null
  finalAmount: number
  isFree: boolean
  discountId: string | null
  couponId: string | null
  /** If coupon validation failed, this contains the error message */
  couponError?: string
}

// ─── Coupon Validation Result ─────────────────────────────────────────────────
export interface CouponValidationResult {
  valid: boolean
  couponId?: string
  code?: string
  discountType?: DiscountType
  discountValue?: number
  discountAmount?: number
  finalAmount?: number
  allowOnDiscounted?: boolean
  error?: string
}

// ─── Checkout Pricing (used by EnrollModal) ───────────────────────────────────
export interface CheckoutPricing {
  originalPrice: number
  productDiscountAmount: number
  couponDiscountAmount: number
  couponCode: string | null
  finalAmount: number
  isFree: boolean
  discountId: string | null
  couponId: string | null
  isLoading: boolean
  error: string | null
  couponError?: string | null
}
