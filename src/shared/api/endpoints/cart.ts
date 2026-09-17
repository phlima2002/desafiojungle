import { request, requestVoid } from '../client'
import {
  cartSchema,
  type AddCartItemRequest,
  type ApplyCouponRequest,
  type UpdateCartItemRequest,
} from '../contracts'

export const cartApi = {
  get: (signal?: AbortSignal) => request(cartSchema, { method: 'GET', url: '/cart', signal }),

  addItem: (body: AddCartItemRequest) =>
    request(cartSchema, { method: 'POST', url: '/cart/items', data: body }),

  updateItem: (itemId: string, body: UpdateCartItemRequest) =>
    request(cartSchema, {
      method: 'PATCH',
      url: `/cart/items/${encodeURIComponent(itemId)}`,
      data: body,
    }),

  removeItem: (itemId: string) =>
    request(cartSchema, { method: 'DELETE', url: `/cart/items/${encodeURIComponent(itemId)}` }),

  applyCoupon: (body: ApplyCouponRequest) =>
    request(cartSchema, { method: 'POST', url: '/cart/coupon', data: body }),

  removeCoupon: () => request(cartSchema, { method: 'DELETE', url: '/cart/coupon' }),

  clear: () => requestVoid({ method: 'DELETE', url: '/cart' }),
}
