import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateTimeSchema, versionSchema } from './common'
import { networkSchema } from './nft'

export const cartItemSchema = z.object({
  id: idSchema,
  nftId: idSchema,
  nftSlug: z.string(),
  editionId: idSchema,
  name: z.string(),
  editionLabel: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  network: networkSchema,
  creatorName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  /** Set by the server when a realtime update changed this line since it was
   *  added — the UI surfaces it as an inline notice instead of silently
   *  re-pricing the cart. */
  priceChangedFrom: ethAmountSchema.nullable(),
  unavailable: z.boolean(),
  nftVersion: versionSchema,
})
export type CartItem = z.infer<typeof cartItemSchema>

export const couponSchema = z.object({
  code: z.string(),
  label: z.string(),
  discountBasisPoints: z.number().int().nonnegative(),
  expiresAt: isoDateTimeSchema.nullable(),
})
export type Coupon = z.infer<typeof couponSchema>

export const cartTotalsSchema = z.object({
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  itemCount: z.number().int().nonnegative(),
})
export type CartTotals = z.infer<typeof cartTotalsSchema>

export const cartSchema = z.object({
  id: idSchema,
  /** Guest carts carry `userId: null` and are merged on login. */
  userId: idSchema.nullable(),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  totals: cartTotalsSchema,
  version: versionSchema,
  updatedAt: isoDateTimeSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemRequestSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  quantity: z.number().int().positive().max(99),
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

export const updateCartItemRequestSchema = z.object({
  quantity: z.number().int().nonnegative().max(99),
})
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>

export const applyCouponRequestSchema = z.object({
  code: z.string().trim().min(3, 'Informe um código válido'),
})
export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>
