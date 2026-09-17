import { z } from 'zod'

/**
 * Amounts in ETH always travel as decimal strings so that no precision is lost
 * on the wire or in JSON. All arithmetic happens in wei (BigInt) — see
 * `@/shared/lib/money`.
 */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
/**
 * Nominal alias rather than a branded type: the value is always a decimal
 * string, and branding would force a cast at every fixture and arithmetic site
 * without buying real safety — `toWei` validates at the only place it matters.
 */
export type EthAmount = string

export const isoDateTimeSchema = z.iso.datetime({ offset: true })

/** Monotonic resource version. Used to discard stale realtime events. */
export const versionSchema = z.number().int().nonnegative()

export const idSchema = z.string().min(1)

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})
export type Pagination = z.infer<typeof paginationSchema>

export function pagedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    pagination: paginationSchema,
  })
}

/* ------------------------------------------------------------------ */
/* Error envelope                                                      */
/* ------------------------------------------------------------------ */

/**
 * Every non-2xx response from the API uses this shape. `code` is the stable,
 * machine-readable discriminator the UI branches on; `message` is a
 * human-readable pt-BR fallback; `details` carries per-field validation errors.
 */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'EMAIL_ALREADY_REGISTERED',
  'INVALID_CREDENTIALS',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_STALE',
  'PRICE_CHANGED',
  'EDITION_SOLD_OUT',
  'INSUFFICIENT_AVAILABILITY',
  'IDEMPOTENCY_KEY_REUSED',
  'ORDER_ALREADY_FINALIZED',
  'PAYMENT_DECLINED',
  'WALLET_CONNECTION_REFUSED',
  'RATE_LIMITED',
  'TRANSIENT_FAILURE',
  'INTERNAL_ERROR',
])
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const fieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
})
export type FieldError = z.infer<typeof fieldErrorSchema>

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.array(fieldErrorSchema).optional(),
    /** Echoed back so a failure can be correlated with the network log. */
    requestId: z.string().optional(),
    /** Present on PRICE_CHANGED / EDITION_SOLD_OUT so the UI can re-render. */
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>
