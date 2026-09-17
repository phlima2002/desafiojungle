import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateTimeSchema } from './common'
import { cartTotalsSchema, couponSchema } from './cart'
import { networkSchema } from './nft'

export const quoteLineSchema = z.object({
  cartItemId: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  editionLabel: z.string(),
  imageUrl: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteProblemSchema = z.object({
  cartItemId: idSchema,
  kind: z.enum(['price-changed', 'sold-out', 'reduced-availability']),
  message: z.string(),
  previousUnitPrice: ethAmountSchema.nullable(),
  currentUnitPrice: ethAmountSchema.nullable(),
  availableQuantity: z.number().int().nonnegative().nullable(),
})
export type QuoteProblem = z.infer<typeof quoteProblemSchema>

/**
 * A quote is the authoritative, short-lived pricing snapshot used to place an
 * order. The checkout cannot submit with a stale `quoteId`: the server answers
 * QUOTE_STALE and the UI asks the collector to review the change first.
 */
export const quoteSchema = z.object({
  id: idSchema,
  cartId: idSchema,
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  coupon: couponSchema.nullable(),
  totals: cartTotalsSchema,
  problems: z.array(quoteProblemSchema),
  /** Hash of lines+totals; the order mutation sends it back for validation. */
  fingerprint: z.string(),
  expiresAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
})
export type Quote = z.infer<typeof quoteSchema>

export const createQuoteRequestSchema = z.object({
  network: networkSchema,
  couponCode: z.string().trim().optional(),
})
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>
