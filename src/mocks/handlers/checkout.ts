import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import {
  createOrderRequestSchema,
  createQuoteRequestSchema,
  type Quote,
  type QuoteLine,
  type QuoteProblem,
} from '@/shared/api/contracts'
import { mulEth } from '@/shared/lib/money'
import { IDEMPOTENCY_HEADER } from '@/shared/api/client'
import {
  computeTotals,
  db,
  ensureCart,
  findCoupon,
  findNft,
  findOrder,
  mutateNft,
  persist,
  projectCart,
  settleOrder,
  touchCart,
} from '../db'
import type { MockOrder } from '../db/types'
import { applyNetworkConditions, errorResponse, hangForever, scenarioFor } from '../network'
import { isResponse, readContext, requireUser, type Cookies } from './context'

const base = env.apiBaseUrl
const QUOTE_TTL_MS = 5 * 60_000

function fingerprintOf(lines: readonly QuoteLine[], couponCode: string | null, network: string): string {
  const payload = JSON.stringify({
    network,
    couponCode,
    lines: lines.map((line) => [line.cartItemId, line.editionId, line.quantity, line.unitPrice]),
  })
  let hash = 5381
  for (let i = 0; i < payload.length; i += 1) hash = ((hash << 5) + hash + payload.charCodeAt(i)) | 0
  return `qf_${(hash >>> 0).toString(36)}`
}

export const checkoutHandlers = [
  http.post(`${base}/quotes`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const context = readContext(cookies as Cookies)
    const user = requireUser(context)
    if (isResponse(user)) return user

    const parsed = createQuoteRequestSchema.safeParse(await request.json())
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Dados da cotação inválidos.')

    const scenario = scenarioFor(request)
    const cart = ensureCart(user.id, null)
    if (cart.items.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Seu carrinho está vazio.')
    }

    // The scenarios that "change the world during checkout" mutate the
    // catalogue for real, so the same change also reaches the client through
    // the realtime channel — not just through this response.
    const firstItem = cart.items[0]!
    if (scenario.quotePriceChanged) {
      mutateNft(firstItem.nftId, (nft) => {
        const edition = nft.editions.find((candidate) => candidate.id === firstItem.editionId)
        if (edition) edition.price = (Number(edition.price) * 1.18).toFixed(2)
      })
    }
    if (scenario.quoteSoldOut) {
      mutateNft(firstItem.nftId, (nft) => {
        const edition = nft.editions.find((candidate) => candidate.id === firstItem.editionId)
        if (edition) edition.available = 0
      })
    }

    const projected = projectCart(cart)
    const problems: QuoteProblem[] = []
    const lines: QuoteLine[] = []

    for (const item of projected.items) {
      const edition = findNft(item.nftId)?.editions.find((candidate) => candidate.id === item.editionId)
      if (!edition || edition.available === 0) {
        problems.push({
          cartItemId: item.id,
          kind: 'sold-out',
          message: `"${item.name}" esgotou enquanto você finalizava a compra.`,
          previousUnitPrice: item.priceChangedFrom,
          currentUnitPrice: null,
          availableQuantity: 0,
        })
        continue
      }
      if (edition.available < item.quantity) {
        problems.push({
          cartItemId: item.id,
          kind: 'reduced-availability',
          message: `Restam ${edition.available} unidades de "${item.name}".`,
          previousUnitPrice: null,
          currentUnitPrice: edition.price,
          availableQuantity: edition.available,
        })
      }
      if (item.priceChangedFrom && item.priceChangedFrom !== edition.price) {
        problems.push({
          cartItemId: item.id,
          kind: 'price-changed',
          message: `O preço de "${item.name}" mudou desde que você adicionou ao carrinho.`,
          previousUnitPrice: item.priceChangedFrom,
          currentUnitPrice: edition.price,
          availableQuantity: edition.available,
        })
      }

      const quantity = Math.min(item.quantity, edition.available)
      lines.push({
        cartItemId: item.id,
        nftId: item.nftId,
        editionId: item.editionId,
        name: item.name,
        editionLabel: item.editionLabel,
        imageUrl: item.imageUrl,
        quantity,
        unitPrice: edition.price,
        lineTotal: mulEth(edition.price, quantity),
      })
    }

    const couponCode = parsed.data.couponCode ?? cart.couponCode
    const coupon = couponCode ? (findCoupon(couponCode) ?? null) : null
    const couponUsable =
      coupon &&
      !scenario.couponExpired &&
      (coupon.expiresAt === null || new Date(coupon.expiresAt) > new Date())

    const totals = computeTotals(
      lines.map((line) => ({ ...line, lineTotal: line.lineTotal }) as never),
      couponUsable ? coupon : null,
      parsed.data.network,
    )

    const quote: Quote = {
      id: `qt_${crypto.randomUUID()}`,
      cartId: cart.id,
      network: parsed.data.network,
      lines,
      coupon: couponUsable ? coupon : null,
      totals,
      problems,
      fingerprint: fingerprintOf(lines, couponUsable ? coupon!.code : null, parsed.data.network),
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    }

    db.quotes = [...db.quotes.filter((candidate) => candidate.cartId !== cart.id), quote].slice(-20)
    persist()
    return HttpResponse.json(quote, { status: 201 })
  }),

  http.get(`${base}/quotes/:quoteId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const quote = db.quotes.find((candidate) => candidate.id === String(params.quoteId))
    if (!quote) return errorResponse('NOT_FOUND', 'Cotação não encontrada ou expirada.')
    return HttpResponse.json(quote)
  }),

  http.post(`${base}/orders`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER)
    if (!idempotencyKey) {
      return errorResponse('VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
    }

    const parsed = createOrderRequestSchema.safeParse(await request.json())
    if (!parsed.success) return errorResponse('VALIDATION_ERROR', 'Dados do pedido inválidos.')

    const scenario = scenarioFor(request)
    const body = parsed.data

    // Replay of the same attempt: return the very same order, never a new one.
    const recorded = db.idempotency[idempotencyKey]
    if (recorded) {
      if (recorded.fingerprint !== body.quoteFingerprint) {
        return errorResponse(
          'IDEMPOTENCY_KEY_REUSED',
          'Esta chave de idempotência já foi usada com outro conteúdo.',
        )
      }
      const existing = findOrder(recorded.orderId)
      if (existing) return HttpResponse.json(existing, { status: 200 })
    }

    const quote = db.quotes.find((candidate) => candidate.id === body.quoteId)
    if (!quote) return errorResponse('NOT_FOUND', 'Cotação não encontrada.')
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      return errorResponse('QUOTE_STALE', 'A cotação expirou. Revise os valores antes de confirmar.')
    }
    if (quote.fingerprint !== body.quoteFingerprint) {
      return errorResponse('QUOTE_STALE', 'Os valores mudaram. Revise o pedido antes de confirmar.')
    }

    const wallet = (db.wallets[user.id] ?? []).find((candidate) => candidate.id === body.walletId)
    if (!wallet) return errorResponse('NOT_FOUND', 'Carteira não encontrada.')
    if (!wallet.connected) {
      return errorResponse('WALLET_CONNECTION_REFUSED', 'Conecte a carteira antes de confirmar o pedido.')
    }

    // Re-validate against the live catalogue: the quote may have been made
    // before a realtime change landed.
    for (const line of quote.lines) {
      const edition = findNft(line.nftId)?.editions.find((candidate) => candidate.id === line.editionId)
      if (!edition || edition.available < line.quantity) {
        return errorResponse(
          'EDITION_SOLD_OUT',
          `"${line.name}" não está mais disponível na quantidade pedida.`,
          {
            meta: { nftId: line.nftId, editionId: line.editionId, available: edition?.available ?? 0 },
          },
        )
      }
      if (edition.price !== line.unitPrice) {
        return errorResponse('PRICE_CHANGED', `O preço de "${line.name}" mudou.`, {
          meta: { nftId: line.nftId, editionId: line.editionId, price: edition.price },
        })
      }
    }

    for (const line of quote.lines) {
      mutateNft(line.nftId, (nft) => {
        const edition = nft.editions.find((candidate) => candidate.id === line.editionId)
        if (edition) edition.available -= line.quantity
      })
    }

    const order: MockOrder = {
      id: `ord_${crypto.randomUUID()}`,
      userId: user.id,
      reference: `KUR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      status: 'pending',
      network: quote.network,
      walletId: wallet.id,
      walletAddress: wallet.address,
      collector: body.collector,
      items: quote.lines.map((line) => ({
        nftId: line.nftId,
        editionId: line.editionId,
        name: line.name,
        editionLabel: line.editionLabel,
        imageUrl: line.imageUrl,
        imageAlt: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      coupon: quote.coupon,
      totals: quote.totals,
      transactionHash: null,
      explorerUrl: null,
      declineReason: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.orders.push(order)
    db.idempotency[idempotencyKey] = { fingerprint: body.quoteFingerprint, orderId: order.id }
    db.lastCollector[user.id] = body.collector

    // Only the purchased lines and quantities leave the cart.
    const cart = ensureCart(user.id, null)
    for (const line of quote.lines) {
      const item = cart.items.find((candidate) => candidate.id === line.cartItemId)
      if (!item) continue
      item.quantity -= line.quantity
      if (item.quantity <= 0) cart.items = cart.items.filter((candidate) => candidate.id !== item.id)
    }
    touchCart(cart)
    persist()

    window.setTimeout(() => settleOrder(order.id, scenario.paymentOutcome), scenario.paymentSettleMs)

    // The order exists on the server; the client never sees the response.
    // Recovery goes through the idempotency key or the order.updated event.
    if (scenario.orderResponseTimeout) return hangForever()

    return HttpResponse.json(order, { status: 201 })
  }),

  http.get(`${base}/orders/:orderId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const order = findOrder(String(params.orderId))
    if (!order) return errorResponse('NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== user.id) return errorResponse('FORBIDDEN', 'Este pedido não pertence à sua conta.')
    return HttpResponse.json(order)
  }),
]
