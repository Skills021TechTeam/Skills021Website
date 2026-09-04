// ============================================================================
// Skills021 — Pricing Service
// The central service that computes the authoritative checkout price by calling
// the server-side Supabase RPC. React components MUST use this — not their own
// price calculations — to determine what to display and what to submit to the
// enrollment system.
//
// CRITICAL SECURITY NOTE:
// The calculate_checkout_price() RPC runs with SECURITY DEFINER in Postgres.
// This means the browser cannot influence the discount calculations — the
// server always fetches the real product price from the database and applies
// the real discount/coupon rules. The amount stored in the enrollment record
// always comes from this function.
// ============================================================================
import { supabase } from './supabase'
import type { PricingBreakdown, ProductType, CheckoutPricing } from './pricingTypes'

// ─── Fetch authoritative pricing from the server ──────────────────────────────
// This calls the calculate_checkout_price() RPC which:
//  1. Fetches the real product price from the DB
//  2. Applies any active product discount
//  3. Validates and applies the coupon (if any)
//  4. Returns the full pricing breakdown
//
// NEVER trust the returned 'finalAmount' from the UI — always re-fetch this
// when creating the enrollment.
export async function fetchCheckoutPrice(
  productType: ProductType,
  productId: string,
  couponCode?: string | null,
  userId?: string | null
): Promise<PricingBreakdown> {
  const { data, error } = await supabase.rpc('calculate_checkout_price', {
    p_product_type: productType,
    p_product_id:   productId,
    p_coupon_code:  couponCode?.trim().toUpperCase() ?? null,
    p_user_id:      userId ?? null,
  })

  if (error) {
    console.error('[pricingService] RPC error:', error.message)
    return {
      originalPrice:         0,
      productDiscountAmount: 0,
      discountedPrice:       0,
      couponDiscountAmount:  0,
      couponCode:            null,
      finalAmount:           0,
      isFree:                false,
      discountId:            null,
      couponId:              null,
      couponError:           'Failed to load pricing. Please refresh.',
    }
  }

  const result = data as Record<string, unknown>

  if (result.error) {
    return {
      originalPrice:         0,
      productDiscountAmount: 0,
      discountedPrice:       0,
      couponDiscountAmount:  0,
      couponCode:            null,
      finalAmount:           0,
      isFree:                false,
      discountId:            null,
      couponId:              null,
      couponError:           result.error as string,
    }
  }

  // Extract coupon error (if coupon was provided but invalid)
  let couponError: string | undefined
  const couponResult = result.coupon_result as Record<string, unknown> | null
  if (couponCode && couponCode.trim() !== '' && couponResult && !couponResult.valid) {
    couponError = (couponResult.error as string) ?? 'Invalid coupon.'
  }

  return {
    originalPrice:         Number(result.original_price ?? 0),
    productDiscountAmount: Number(result.product_discount_amount ?? 0),
    discountedPrice:       Number(result.discounted_price ?? 0),
    couponDiscountAmount:  Number(result.coupon_discount_amount ?? 0),
    couponCode:            (result.coupon_code as string) ?? null,
    finalAmount:           Number(result.final_amount ?? 0),
    isFree:                Boolean(result.is_free),
    discountId:            (result.discount_id as string) ?? null,
    couponId:              (result.coupon_id as string) ?? null,
    couponError,
  }
}

// ─── Format price for display ─────────────────────────────────────────────────
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

// ─── Initial checkout pricing state ──────────────────────────────────────────
export function initialCheckoutPricing(fallbackPrice: number = 0): CheckoutPricing {
  return {
    originalPrice:         fallbackPrice,
    productDiscountAmount: 0,
    couponDiscountAmount:  0,
    couponCode:            null,
    finalAmount:           fallbackPrice,
    isFree:                fallbackPrice === 0,
    discountId:            null,
    couponId:              null,
    isLoading:             true,
    error:                 null,
  }
}

// ─── Build CheckoutPricing from a PricingBreakdown ────────────────────────────
export function toCheckoutPricing(breakdown: PricingBreakdown): CheckoutPricing {
  return {
    originalPrice:         breakdown.originalPrice,
    productDiscountAmount: breakdown.productDiscountAmount,
    couponDiscountAmount:  breakdown.couponDiscountAmount,
    couponCode:            breakdown.couponCode,
    finalAmount:           breakdown.finalAmount,
    isFree:                breakdown.isFree,
    discountId:            breakdown.discountId,
    couponId:              breakdown.couponId,
    isLoading:             false,
    error:                 breakdown.couponError ?? null,
    couponError:           breakdown.couponError ?? null,
  }
}

// ─── Discount percentage for display ─────────────────────────────────────────
export function computeDiscountPercentage(
  originalPrice: number,
  finalAmount: number
): number {
  if (originalPrice <= 0) return 0
  return Math.round(((originalPrice - finalAmount) / originalPrice) * 100)
}

// ─── Safely get numeric price from course/resource price field ────────────────
// The Course type uses price: number | 'FREE' — normalize here.
export function getNumericPrice(price: number | 'FREE' | undefined | null): number {
  if (price === 'FREE' || price == null) return 0
  return typeof price === 'number' ? price : Number(price) || 0
}
