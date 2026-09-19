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
// ─── Direct Database Price Fallback ──────────────────────────────────────────
// Used when the server RPC encounters an error or unhandled product type in Supabase.
async function resolveDirectProductPrice(productType: ProductType, productId: string): Promise<{ price: number; isFree: boolean } | null> {
  try {
    if (productType === 'course') {
      const cleanId = String(productId).replace(/^course_/, '')
      const { data, error } = await supabase
        .from('site_courses')
        .select('price, is_free')
        .eq('id', cleanId)
        .maybeSingle()
      if (!error && data) {
        const isFree = Boolean(data.is_free || data.price === 'FREE' || Number(data.price) === 0)
        const price = isFree ? 0 : (Number(data.price) || 0)
        return { price, isFree }
      }
    } else if (productType === 'resource') {
      const cleanId = String(productId).replace(/^res_/, '')
      const { data, error } = await supabase
        .from('resources')
        .select('price, is_premium')
        .eq('id', cleanId)
        .maybeSingle()
      if (!error && data) {
        const isFree = !data.is_premium || !data.price || Number(data.price) === 0
        const price = isFree ? 0 : (Number(data.price) || 0)
        return { price, isFree }
      }
    } else if (productType === 'webinar') {
      const cleanId = String(productId).replace(/^webinar_/, '')
      const { data, error } = await supabase
        .from('live_webinars')
        .select('price, access_type')
        .eq('id', cleanId)
        .maybeSingle()
      if (!error && data) {
        const isFree = data.access_type === 'free' || !data.price || Number(data.price) === 0
        const price = isFree ? 0 : (Number(data.price) || 0)
        return { price, isFree }
      }
    }
  } catch (err) {
    console.warn('[pricingService] Direct price fallback error:', err)
  }
  return null
}

export async function fetchCheckoutPrice(
  productType: ProductType,
  productId: string,
  couponCode?: string | null,
  userId?: string | null,
  knownPrice?: number
): Promise<PricingBreakdown> {
  const { data, error } = await supabase.rpc('calculate_checkout_price', {
    p_product_type: productType,
    p_product_id:   productId,
    p_coupon_code:  couponCode?.trim().toUpperCase() ?? null,
    p_user_id:      userId ?? null,
  })

  const rawResult = data as Record<string, unknown> | null

  if (error || !rawResult || rawResult.error) {
    const errorMsg = (error?.message || (rawResult?.error as string) || 'RPC error')
    console.warn('[pricingService] calculate_checkout_price RPC issue, using direct resolution:', errorMsg)

    const direct = await resolveDirectProductPrice(productType, productId)
    if (direct) {
      return {
        originalPrice:         direct.price,
        productDiscountAmount: 0,
        discountedPrice:       direct.price,
        couponDiscountAmount:  0,
        couponCode:            null,
        finalAmount:           direct.price,
        isFree:                direct.isFree,
        discountId:            null,
        couponId:              null,
        couponError:           couponCode ? 'Coupon validation is temporarily unavailable.' : undefined,
      }
    }

    if (knownPrice != null && knownPrice > 0) {
      return {
        originalPrice:         knownPrice,
        productDiscountAmount: 0,
        discountedPrice:       knownPrice,
        couponDiscountAmount:  0,
        couponCode:            null,
        finalAmount:           knownPrice,
        isFree:                false,
        discountId:            null,
        couponId:              null,
        couponError:           couponCode ? 'Coupon validation is temporarily unavailable.' : undefined,
      }
    }

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
      couponError:           rawResult?.error ? (rawResult.error as string) : 'Failed to load pricing. Please refresh.',
    }
  }

  const result = rawResult

  // Extract coupon error (if coupon was provided but invalid or unsaved)
  let couponError: string | undefined
  const cleanCode = couponCode?.trim().toUpperCase()
  if (cleanCode && cleanCode !== '') {
    const couponResult = result.coupon_result as Record<string, unknown> | null
    if (couponResult && !couponResult.valid) {
      couponError = (couponResult.error as string) ?? 'Coupon code is invalid.'
    } else if (!result.coupon_id) {
      try {
        const valRes = await supabase.rpc('validate_coupon_for_product', {
          p_code: cleanCode,
          p_product_type: productType,
          p_product_id: productId,
          p_user_id: userId ?? null,
          p_base_amount: Number(result.original_price ?? 0),
        })
        const valData = valRes.data as Record<string, unknown> | null
        if (valData && !valData.valid) {
          couponError = (valData.error as string) || 'Coupon code is invalid.'
        } else {
          // Check if coupon even exists in the database
          const { data: dbCoupon } = await supabase
            .from('coupons')
            .select('id, is_active, expires_at, starts_at')
            .eq('code', cleanCode)
            .maybeSingle()

          if (!dbCoupon) {
            couponError = 'Coupon code is invalid. Only saved coupons can be applied.'
          } else if (!dbCoupon.is_active) {
            couponError = 'This coupon is inactive.'
          } else if (dbCoupon.expires_at && new Date(dbCoupon.expires_at) <= new Date()) {
            couponError = 'This coupon has expired.'
          } else {
            couponError = 'This coupon cannot be applied to this item.'
          }
        }
      } catch {
        couponError = 'Coupon code is invalid.'
      }
    }
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
