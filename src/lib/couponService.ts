// ============================================================================
// Skills021 — Coupon Service
// CRUD operations for coupons, coupon_products, coupon_redemptions tables.
// All write operations are admin-only (enforced by Supabase RLS).
// Validation is done server-side via RPC (validate_coupon_for_product).
// ============================================================================
import { supabase } from './supabase'
import type {
  Coupon,
  CouponProduct,
  CouponRedemption,
  CouponStatus,
  CouponValidationResult,
  ProductType,
  CreateCouponInput,
  UpdateCouponInput,
} from './pricingTypes'
export type { Coupon, CouponProduct, CouponRedemption }

// ─── Column selections ─────────────────────────────────────────────────────────
const COUPON_SELECT =
  'id, code, description, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, allow_on_discounted, starts_at, expires_at, usage_limit, used_count, per_user_limit, is_active, created_by, created_at, updated_at'

const COUPON_PRODUCT_SELECT =
  'id, coupon_id, product_type, product_id, created_at'

const REDEMPTION_SELECT =
  'id, coupon_id, user_id, enrollment_id, product_type, product_id, discount_amount, original_amount, final_amount, redeemed_at'

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapCoupon(row: Record<string, unknown>): Coupon {
  const coupon: Coupon = {
    id:                    row.id as string,
    code:                  row.code as string,
    description:           (row.description as string) ?? '',
    discountType:          row.discount_type as Coupon['discountType'],
    discountValue:         Number(row.discount_value),
    minimumOrderAmount:    Number(row.minimum_order_amount ?? 0),
    maximumDiscountAmount: row.maximum_discount_amount != null ? Number(row.maximum_discount_amount) : null,
    allowOnDiscounted:     Boolean(row.allow_on_discounted),
    startsAt:              (row.starts_at as string) ?? null,
    expiresAt:             (row.expires_at as string) ?? null,
    usageLimit:            row.usage_limit != null ? Number(row.usage_limit) : null,
    usedCount:             Number(row.used_count ?? 0),
    perUserLimit:          row.per_user_limit != null ? Number(row.per_user_limit) : null,
    isActive:              Boolean(row.is_active),
    createdBy:             (row.created_by as string) ?? null,
    createdAt:             row.created_at as string,
    updatedAt:             row.updated_at as string,
  }
  coupon.status = getCouponStatus(coupon)
  return coupon
}

function mapCouponProduct(row: Record<string, unknown>): CouponProduct {
  return {
    id:          row.id as string,
    couponId:    row.coupon_id as string,
    productType: row.product_type as ProductType,
    productId:   String(row.product_id),
    createdAt:   row.created_at as string,
  }
}

function mapRedemption(row: Record<string, unknown>): CouponRedemption {
  return {
    id:             row.id as string,
    couponId:       row.coupon_id as string,
    couponCode:     (row.coupon_code as string) ?? undefined,
    userId:         row.user_id as string,
    userEmail:      (row.user_email as string) ?? undefined,
    userName:       (row.user_name as string) ?? undefined,
    enrollmentId:   (row.enrollment_id as string) ?? null,
    productType:    row.product_type as ProductType,
    productId:      String(row.product_id),
    productTitle:   (row.product_title as string) ?? undefined,
    discountAmount: Number(row.discount_amount),
    originalAmount: Number(row.original_amount),
    finalAmount:    Number(row.final_amount),
    redeemedAt:     row.redeemed_at as string,
  }
}

// ─── Compute coupon status ─────────────────────────────────────────────────────
export function getCouponStatus(coupon: Coupon): CouponStatus {
  if (!coupon.isActive) return 'Disabled'
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'Exhausted'
  const now = new Date()
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return 'Scheduled'
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return 'Expired'
  return 'Active'
}

// ─── Fetch all coupons (Admin) ────────────────────────────────────────────────
export async function fetchAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select(COUPON_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch coupons: ${error.message}`)
  return (data ?? []).map(row => mapCoupon(row as Record<string, unknown>))
}

// ─── Fetch coupon products (product restrictions for a coupon) ────────────────
export async function fetchCouponProducts(couponId: string): Promise<CouponProduct[]> {
  const { data, error } = await supabase
    .from('coupon_products')
    .select(COUPON_PRODUCT_SELECT)
    .eq('coupon_id', couponId)

  if (error) throw new Error(`Failed to fetch coupon products: ${error.message}`)
  return (data ?? []).map(row => mapCouponProduct(row as Record<string, unknown>))
}

// ─── Validate coupon via server-side RPC ─────────────────────────────────────
// This is the ONLY way the frontend should validate coupons.
// The RPC runs as SECURITY DEFINER — results cannot be manipulated by the client.
export async function validateCoupon(
  code: string,
  productType: ProductType,
  productId: string,
  userId: string | null,
  baseAmount: number
): Promise<CouponValidationResult> {
  const { data, error } = await supabase.rpc('validate_coupon_for_product', {
    p_code:         code.trim().toUpperCase(),
    p_product_type: productType,
    p_product_id:   productId,
    p_user_id:      userId ?? null,
    p_base_amount:  baseAmount,
  })

  if (error) {
    console.warn('[couponService] RPC error validating coupon:', error.message)
    return { valid: false, error: 'Unable to validate coupon. Please try again.' }
  }

  const result = data as Record<string, unknown>

  if (!result.valid) {
    return {
      valid: false,
      error: (result.error as string) ?? 'Invalid coupon.',
    }
  }

  return {
    valid:              true,
    couponId:           result.coupon_id as string,
    code:               result.code as string,
    discountType:       result.discount_type as CouponValidationResult['discountType'],
    discountValue:      Number(result.discount_value),
    discountAmount:     Number(result.discount_amount),
    finalAmount:        Number(result.final_amount),
    allowOnDiscounted:  Boolean(result.allow_on_discounted),
  }
}

// ─── Create coupon (Admin only) ───────────────────────────────────────────────
export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const normalizedCode = input.code.trim().toUpperCase()

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code:                    normalizedCode,
      description:             input.description ?? '',
      discount_type:           input.discountType,
      discount_value:          input.discountValue,
      minimum_order_amount:    input.minimumOrderAmount ?? 0,
      maximum_discount_amount: input.maximumDiscountAmount ?? null,
      allow_on_discounted:     input.allowOnDiscounted ?? false,
      starts_at:               input.startsAt ?? null,
      expires_at:              input.expiresAt ?? null,
      usage_limit:             input.usageLimit ?? null,
      per_user_limit:          input.perUserLimit ?? 1,
      is_active:               input.isActive ?? true,
    })
    .select(COUPON_SELECT)
    .single()

  if (error) throw new Error(`Failed to create coupon: ${error.message}`)
  const coupon = mapCoupon(data as Record<string, unknown>)

  // If product restrictions provided, insert them
  if (input.products && input.products.length > 0) {
    const productRows = input.products.map(p => ({
      coupon_id:    coupon.id,
      product_type: p.productType,
      product_id:   p.productId,
    }))
    const { error: prodErr } = await supabase
      .from('coupon_products')
      .insert(productRows)
    if (prodErr) throw new Error(`Failed to set coupon product restrictions: ${prodErr.message}`)
  }

  return coupon
}

// ─── Update coupon (Admin only) ───────────────────────────────────────────────
export async function updateCoupon(
  id: string,
  input: UpdateCouponInput
): Promise<Coupon> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.description !== undefined)           payload.description             = input.description
  if (input.discountType !== undefined)          payload.discount_type           = input.discountType
  if (input.discountValue !== undefined)         payload.discount_value          = input.discountValue
  if (input.minimumOrderAmount !== undefined)    payload.minimum_order_amount    = input.minimumOrderAmount
  if (input.maximumDiscountAmount !== undefined) payload.maximum_discount_amount = input.maximumDiscountAmount
  if (input.allowOnDiscounted !== undefined)     payload.allow_on_discounted     = input.allowOnDiscounted
  if (input.startsAt !== undefined)              payload.starts_at               = input.startsAt
  if (input.expiresAt !== undefined)             payload.expires_at              = input.expiresAt
  if (input.usageLimit !== undefined)            payload.usage_limit             = input.usageLimit
  if (input.perUserLimit !== undefined)          payload.per_user_limit          = input.perUserLimit
  if (input.isActive !== undefined)              payload.is_active               = input.isActive

  const { data, error } = await supabase
    .from('coupons')
    .update(payload)
    .eq('id', id)
    .select(COUPON_SELECT)
    .single()

  if (error) throw new Error(`Failed to update coupon: ${error.message}`)
  const coupon = mapCoupon(data as Record<string, unknown>)

  // Update product restrictions if provided
  if (input.products !== undefined) {
    // Delete existing restrictions for this coupon
    await supabase.from('coupon_products').delete().eq('coupon_id', id)

    // Insert new ones (if any)
    if (input.products.length > 0) {
      const productRows = input.products.map(p => ({
        coupon_id:    id,
        product_type: p.productType,
        product_id:   p.productId,
      }))
      const { error: prodErr } = await supabase
        .from('coupon_products')
        .insert(productRows)
      if (prodErr) throw new Error(`Failed to update coupon product restrictions: ${prodErr.message}`)
    }
  }

  return coupon
}

// ─── Delete coupon (Admin only) ───────────────────────────────────────────────
export async function deleteCoupon(id: string): Promise<void> {
  // coupon_products will cascade-delete via FK
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete coupon: ${error.message}`)
}

// ─── Toggle coupon active (Admin only) ───────────────────────────────────────
export async function toggleCouponActive(id: string, isActive: boolean): Promise<Coupon> {
  return updateCoupon(id, { isActive })
}

// ─── Fetch coupon redemptions (Admin) ─────────────────────────────────────────
// Returns redemptions with basic user + product info for the admin usage panel.
export async function fetchCouponRedemptions(
  couponId?: string
): Promise<CouponRedemption[]> {
  let query = supabase
    .from('coupon_redemptions')
    .select(REDEMPTION_SELECT)
    .order('redeemed_at', { ascending: false })

  if (couponId) {
    query = query.eq('coupon_id', couponId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch coupon redemptions: ${error.message}`)
  return (data ?? []).map(row => mapRedemption(row as Record<string, unknown>))
}

// ─── Fetch all redemptions with coupon code and user email (Admin) ────────────
// Uses a join via enrolled + profiles to get human-readable data for admin UI.
export async function fetchAllCouponRedemptionsWithDetails(): Promise<CouponRedemption[]> {
  // Fetch redemptions with joined coupon code
  const { data, error } = await supabase
    .from('coupon_redemptions')
    .select(`
      id, coupon_id, user_id, enrollment_id, product_type, product_id,
      discount_amount, original_amount, final_amount, redeemed_at,
      coupons ( code )
    `)
    .order('redeemed_at', { ascending: false })
    .limit(500)  // Prevent unbounded fetch

  if (error) throw new Error(`Failed to fetch redemption details: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const couponRow = row.coupons as Record<string, unknown> | null
    return {
      id:             row.id as string,
      couponId:       row.coupon_id as string,
      couponCode:     (couponRow?.code as string) ?? undefined,
      userId:         row.user_id as string,
      enrollmentId:   (row.enrollment_id as string) ?? null,
      productType:    row.product_type as ProductType,
      productId:      String(row.product_id),
      discountAmount: Number(row.discount_amount),
      originalAmount: Number(row.original_amount),
      finalAmount:    Number(row.final_amount),
      redeemedAt:     row.redeemed_at as string,
    }
  })
}

// ─── Record a coupon redemption (called after admin approves payment) ─────────
// Uses SECURITY DEFINER RPC — cannot be called with arbitrary amounts from frontend.
export async function recordCouponRedemption(
  couponId: string,
  userId: string,
  enrollmentId: string,
  productType: ProductType,
  productId: string,
  discountAmount: number,
  originalAmount: number,
  finalAmount: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('record_coupon_redemption', {
    p_coupon_id:      couponId,
    p_user_id:        userId,
    p_enrollment_id:  enrollmentId,
    p_product_type:   productType,
    p_product_id:     productId,
    p_discount_amount: discountAmount,
    p_original_amount: originalAmount,
    p_final_amount:    finalAmount,
  })

  if (error) {
    console.error('[couponService] Failed to record redemption:', error.message)
    return false
  }

  return Boolean(data)
}

// ─── Format discount for display ──────────────────────────────────────────────
export function formatCouponDiscount(coupon: Pick<Coupon, 'discountType' | 'discountValue'>): string {
  return coupon.discountType === 'percentage'
    ? `${coupon.discountValue}% OFF`
    : `₹${coupon.discountValue} OFF`
}
