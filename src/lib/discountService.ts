// ============================================================================
// Skills021 — Discount Service
// CRUD operations for product_discounts table.
// All write operations are admin-only (enforced by Supabase RLS).
// ============================================================================
import { supabase } from './supabase'
import type {
  ProductDiscount,
  ProductType,
  CreateProductDiscountInput,
  UpdateProductDiscountInput,
} from './pricingTypes'
export type { ProductDiscount }

// ─── Column selection ─────────────────────────────────────────────────────────
const DISCOUNT_SELECT =
  'id, product_type, product_id, discount_type, discount_value, max_discount_amount, starts_at, expires_at, is_active, created_by, created_at, updated_at'

function mapDiscount(row: Record<string, unknown>): ProductDiscount {
  return {
    id:                 row.id as string,
    productType:        row.product_type as ProductType,
    productId:          String(row.product_id),
    discountType:       row.discount_type as ProductDiscount['discountType'],
    discountValue:      Number(row.discount_value),
    maxDiscountAmount:  row.max_discount_amount != null ? Number(row.max_discount_amount) : null,
    startsAt:           (row.starts_at as string) ?? null,
    expiresAt:          (row.expires_at as string) ?? null,
    isActive:           Boolean(row.is_active),
    createdBy:          (row.created_by as string) ?? null,
    createdAt:          row.created_at as string,
    updatedAt:          row.updated_at as string,
  }
}

// ─── Fetch all discounts (Admin) ──────────────────────────────────────────────
export async function fetchAllDiscounts(
  productType?: ProductType
): Promise<ProductDiscount[]> {
  let query = supabase
    .from('product_discounts')
    .select(DISCOUNT_SELECT)
    .order('created_at', { ascending: false })

  if (productType) {
    query = query.eq('product_type', productType)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch discounts: ${error.message}`)
  return (data ?? []).map(mapDiscount)
}

// ─── Fetch discounts for a specific product ───────────────────────────────────
export async function fetchDiscountsForProduct(
  productType: ProductType,
  productId: string
): Promise<ProductDiscount[]> {
  const { data, error } = await supabase
    .from('product_discounts')
    .select(DISCOUNT_SELECT)
    .eq('product_type', productType)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch product discounts: ${error.message}`)
  return (data ?? []).map(mapDiscount)
}

// ─── Fetch the currently active discount for a product ────────────────────────
// Uses the Supabase RPC for server-side filtering (avoids fetching all discounts).
export async function fetchActiveDiscount(
  productType: ProductType,
  productId: string
): Promise<ProductDiscount | null> {
  const { data, error } = await supabase
    .rpc('get_active_product_discount', {
      p_product_type: productType,
      p_product_id:   productId,
    })

  if (error) {
    console.warn(`[discountService] Failed to fetch active discount: ${error.message}`)
    return null
  }

  const row = (data ?? [])[0]
  if (!row?.id) return null

  // The RPC returns a subset of columns; build a minimal ProductDiscount
  return {
    id:                 String(row.id),
    productType,
    productId,
    discountType:       row.discount_type as ProductDiscount['discountType'],
    discountValue:      Number(row.discount_value),
    maxDiscountAmount:  row.max_discount_amount != null ? Number(row.max_discount_amount) : null,
    startsAt:           null,
    expiresAt:          null,
    isActive:           true,
    createdBy:          null,
    createdAt:          '',
    updatedAt:          '',
  }
}

// ─── Create discount (Admin only) ─────────────────────────────────────────────
export async function createDiscount(
  input: CreateProductDiscountInput
): Promise<ProductDiscount> {
  const { data, error } = await supabase
    .from('product_discounts')
    .insert({
      product_type:        input.productType,
      product_id:          input.productId,
      discount_type:       input.discountType,
      discount_value:      input.discountValue,
      max_discount_amount: input.maxDiscountAmount ?? null,
      starts_at:           input.startsAt ?? null,
      expires_at:          input.expiresAt ?? null,
      is_active:           input.isActive ?? true,
    })
    .select(DISCOUNT_SELECT)
    .single()

  if (error) throw new Error(`Failed to create discount: ${error.message}`)
  return mapDiscount(data as Record<string, unknown>)
}

// ─── Update discount (Admin only) ─────────────────────────────────────────────
export async function updateDiscount(
  id: string,
  input: UpdateProductDiscountInput
): Promise<ProductDiscount> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.discountType !== undefined)       payload.discount_type        = input.discountType
  if (input.discountValue !== undefined)      payload.discount_value       = input.discountValue
  if (input.maxDiscountAmount !== undefined)  payload.max_discount_amount  = input.maxDiscountAmount
  if (input.startsAt !== undefined)           payload.starts_at            = input.startsAt
  if (input.expiresAt !== undefined)          payload.expires_at           = input.expiresAt
  if (input.isActive !== undefined)           payload.is_active            = input.isActive

  const { data, error } = await supabase
    .from('product_discounts')
    .update(payload)
    .eq('id', id)
    .select(DISCOUNT_SELECT)
    .single()

  if (error) throw new Error(`Failed to update discount: ${error.message}`)
  return mapDiscount(data as Record<string, unknown>)
}

// ─── Delete discount (Admin only) ─────────────────────────────────────────────
export async function deleteDiscount(id: string): Promise<void> {
  const { error } = await supabase
    .from('product_discounts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete discount: ${error.message}`)
}

// ─── Toggle discount active state (Admin only) ────────────────────────────────
export async function toggleDiscountActive(
  id: string,
  isActive: boolean
): Promise<ProductDiscount> {
  return updateDiscount(id, { isActive })
}

// ─── Compute discount label for display (client-side utility) ─────────────────
export function formatDiscountLabel(discount: ProductDiscount): string {
  if (discount.discountType === 'percentage') {
    return `${discount.discountValue}% OFF`
  }
  return `₹${discount.discountValue} OFF`
}

// ─── Compute discounted price client-side (for display only) ─────────────────
// NOTE: For payment amounts, always use calculate_checkout_price() RPC instead.
export function applyDiscountToPrice(
  originalPrice: number,
  discount: ProductDiscount
): number {
  if (originalPrice <= 0) return 0

  let discountAmt: number
  if (discount.discountType === 'percentage') {
    discountAmt = originalPrice * (discount.discountValue / 100)
    if (discount.maxDiscountAmount != null) {
      discountAmt = Math.min(discountAmt, discount.maxDiscountAmount)
    }
  } else {
    discountAmt = discount.discountValue
  }

  return Math.max(originalPrice - discountAmt, 0)
}

// ─── Get the effective status of a discount ───────────────────────────────────
export function getDiscountStatus(
  discount: ProductDiscount
): 'Active' | 'Scheduled' | 'Expired' | 'Disabled' {
  if (!discount.isActive) return 'Disabled'
  const now = new Date()
  if (discount.startsAt && new Date(discount.startsAt) > now) return 'Scheduled'
  if (discount.expiresAt && new Date(discount.expiresAt) <= now) return 'Expired'
  return 'Active'
}
