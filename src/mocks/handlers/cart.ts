import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import {
  addCartItemRequestSchema,
  applyCouponRequestSchema,
  updateCartItemRequestSchema,
} from '@/shared/api/contracts'
import { ensureCart, findCart, findCoupon, findNft, projectCart, touchCart, db, persist } from '../db'
import { applyNetworkConditions, errorResponse, scenarioFor } from '../network'
import { guestCookie, readContext, type Cookies } from './context'

const base = env.apiBaseUrl

/** Guests get a cart too: the cookie keeps it across refreshes until login. */
function resolveCart(cookies: Cookies) {
  const context = readContext(cookies)
  const guestId = context.user ? null : (context.guestId ?? `guest_${crypto.randomUUID()}`)
  const cart = ensureCart(context.user?.id ?? null, guestId)
  const issuedGuestCookie = !context.user && context.guestId !== guestId ? guestCookie(guestId!) : undefined
  return { context, cart, issuedGuestCookie }
}

function cartResponse(cart: ReturnType<typeof ensureCart>, setCookie?: string) {
  return HttpResponse.json(
    projectCart(cart),
    setCookie ? { headers: { 'Set-Cookie': setCookie } } : undefined,
  )
}

export const cartHandlers = [
  http.get(`${base}/cart`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const { cart, issuedGuestCookie } = resolveCart(cookies as Cookies)
    return cartResponse(cart, issuedGuestCookie)
  }),

  http.post(`${base}/cart/items`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const parsed = addCartItemRequestSchema.safeParse(await request.json())
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Item inválido.')

    const nft = findNft(parsed.data.nftId)
    const edition = nft?.editions.find((candidate) => candidate.id === parsed.data.editionId)
    if (!nft || !edition) return errorResponse('NOT_FOUND', 'Edição não encontrada.')
    if (edition.available === 0) {
      return errorResponse('EDITION_SOLD_OUT', 'Esta edição está esgotada.', { meta: { nftId: nft.id } })
    }

    const { cart, issuedGuestCookie } = resolveCart(cookies as Cookies)
    const existing = cart.items.find((item) => item.nftId === nft.id && item.editionId === edition.id)
    const ceiling = Math.min(edition.available, edition.maxPerOrder)
    const desired = (existing?.quantity ?? 0) + parsed.data.quantity

    if (desired > ceiling) {
      return errorResponse('INSUFFICIENT_AVAILABILITY', `Restam apenas ${ceiling} unidades desta edição.`, {
        meta: { available: ceiling },
      })
    }

    if (existing) existing.quantity = desired
    else
      cart.items.push({
        id: `ci_${crypto.randomUUID()}`,
        nftId: nft.id,
        editionId: edition.id,
        quantity: parsed.data.quantity,
        addedUnitPrice: edition.price,
      })

    touchCart(cart)
    return cartResponse(cart, issuedGuestCookie)
  }),

  http.patch(`${base}/cart/items/:itemId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const parsed = updateCartItemRequestSchema.safeParse(await request.json())
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Quantidade inválida.')

    const { cart } = resolveCart(cookies as Cookies)
    const item = cart.items.find((candidate) => candidate.id === String(params.itemId))
    if (!item) return errorResponse('NOT_FOUND', 'Item não está no carrinho.')

    if (parsed.data.quantity === 0) {
      cart.items = cart.items.filter((candidate) => candidate.id !== item.id)
      touchCart(cart)
      return cartResponse(cart)
    }

    const edition = findNft(item.nftId)?.editions.find((candidate) => candidate.id === item.editionId)
    const ceiling = Math.min(edition?.available ?? 0, edition?.maxPerOrder ?? 0)
    if (parsed.data.quantity > ceiling) {
      return errorResponse('INSUFFICIENT_AVAILABILITY', `Restam apenas ${ceiling} unidades desta edição.`, {
        meta: { available: ceiling },
      })
    }

    item.quantity = parsed.data.quantity
    touchCart(cart)
    return cartResponse(cart)
  }),

  http.delete(`${base}/cart/items/:itemId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const { cart } = resolveCart(cookies as Cookies)
    cart.items = cart.items.filter((candidate) => candidate.id !== String(params.itemId))
    touchCart(cart)
    return cartResponse(cart)
  }),

  http.post(`${base}/cart/coupon`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const parsed = applyCouponRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('COUPON_INVALID', 'Informe um código válido.', {
        details: [{ field: 'code', code: 'invalid', message: 'Informe um código válido' }],
      })
    }

    const coupon = findCoupon(parsed.data.code)
    if (!coupon) {
      return errorResponse('COUPON_INVALID', 'Cupom não encontrado.', {
        details: [{ field: 'code', code: 'not_found', message: 'Cupom inválido' }],
      })
    }

    const expired =
      scenarioFor(request).couponExpired ||
      (coupon.expiresAt !== null && new Date(coupon.expiresAt).getTime() < Date.now())
    if (expired) {
      return errorResponse('COUPON_EXPIRED', 'Este cupom expirou.', {
        details: [{ field: 'code', code: 'expired', message: 'Cupom expirado' }],
      })
    }

    const { cart } = resolveCart(cookies as Cookies)
    cart.couponCode = coupon.code
    touchCart(cart)
    return cartResponse(cart)
  }),

  http.delete(`${base}/cart/coupon`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const { cart } = resolveCart(cookies as Cookies)
    cart.couponCode = null
    touchCart(cart)
    return cartResponse(cart)
  }),

  http.delete(`${base}/cart`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const context = readContext(cookies as Cookies)
    const cart = findCart(context.user?.id ?? null, context.guestId)
    if (cart) {
      db.carts = db.carts.filter((candidate) => candidate.id !== cart.id)
      persist()
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
