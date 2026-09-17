import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateTimeSchema, versionSchema } from './common'
import { cartTotalsSchema, couponSchema } from './cart'
import { networkSchema } from './nft'
import { collectorDetailsSchema } from './wallets'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const orderItemSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  editionLabel: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
})
export type OrderItem = z.infer<typeof orderItemSchema>

/**
 * The receipt is an immutable snapshot: later catalogue changes never alter a
 * placed order's prices, names or totals.
 */
export const orderSchema = z.object({
  id: idSchema,
  reference: z.string(),
  status: orderStatusSchema,
  network: networkSchema,
  walletId: idSchema,
  walletAddress: z.string(),
  collector: collectorDetailsSchema,
  items: z.array(orderItemSchema),
  coupon: couponSchema.nullable(),
  totals: cartTotalsSchema,
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  declineReason: z.string().nullable(),
  version: versionSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type Order = z.infer<typeof orderSchema>

export const createOrderRequestSchema = z.object({
  quoteId: idSchema,
  /** Guards against acting on a quote the user has not re-reviewed. */
  quoteFingerprint: z.string(),
  walletId: idSchema,
  network: networkSchema,
  collector: collectorDetailsSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>
