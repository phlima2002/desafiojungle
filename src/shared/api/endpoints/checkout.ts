import { IDEMPOTENCY_HEADER, request } from '../client'
import { orderSchema, quoteSchema, type CreateOrderRequest, type CreateQuoteRequest } from '../contracts'

export const checkoutApi = {
  /** Re-prices the cart and returns the authoritative snapshot to confirm. */
  createQuote: (body: CreateQuoteRequest) =>
    request(quoteSchema, { method: 'POST', url: '/quotes', data: body }),

  getQuote: (quoteId: string, signal?: AbortSignal) =>
    request(quoteSchema, { method: 'GET', url: `/quotes/${encodeURIComponent(quoteId)}`, signal }),

  /**
   * Idempotent. Re-sending the same key with the same body returns the very
   * same order; re-using it with a different body answers 409 CONFLICT.
   */
  createOrder: (body: CreateOrderRequest, idempotencyKey: string) =>
    request(orderSchema, {
      method: 'POST',
      url: '/orders',
      data: body,
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    }),

  getOrder: (orderId: string, signal?: AbortSignal) =>
    request(orderSchema, { method: 'GET', url: `/orders/${encodeURIComponent(orderId)}`, signal }),
}
