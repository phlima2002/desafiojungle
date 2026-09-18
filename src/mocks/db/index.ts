import type { Cart, CartItem, CartTotals, Coupon, NftDetail, NftSummary } from '@/shared/api/contracts'
import { addEth, mulEth, percentOfEth, subEth, sumEth } from '@/shared/lib/money'
import { env } from '@/shared/config/env'
import { NETWORK_FEES } from '../fixtures/catalog'
import { createSeedDatabase, SCHEMA_VERSION } from './seed'
import type { MockCart, MockDatabase, MockUser } from './types'

const STORAGE_KEY = 'kurio.mock.db.v1'
const SESSION_TTL_MS = 30 * 60_000

type DbEvent =
  { type: 'nft.changed'; nftId: string } | { type: 'order.changed'; orderId: string; userId: string }

const listeners = new Set<(event: DbEvent) => void>()

export function onDbEvent(listener: (event: DbEvent) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(event: DbEvent): void {
  for (const listener of listeners) listener(event)
}

function load(): MockDatabase {
  if (typeof window === 'undefined') return createSeedDatabase(env.mockSeed)
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDatabase
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    }
  } catch {
    /* corrupted or unavailable storage — fall through to a fresh seed */
  }
  return createSeedDatabase(env.mockSeed)
}

export let db: MockDatabase = load()

/**
 * Writes synchronously, on purpose. A debounce here used to coalesce bursts,
 * but it opened a window in which a reload landing right after a mutation read
 * back the pre-mutation state — the cart emptying itself on F5. The write is a
 * `JSON.stringify` of a few hundred kB on user-sized actions, which costs a
 * couple of milliseconds; correctness is worth more than that.
 */
export function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* quota or private mode — the in-memory database keeps working */
  }
}

/** Restores the known-good scenario. Every test starts from here. */
export function resetDatabase(seed = env.mockSeed): void {
  db = createSeedDatabase(seed)
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  persist()
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = `sess_${crypto.randomUUID()}`
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.sessions = db.sessions.filter((session) => session.userId !== userId)
  db.sessions.push({ token, userId, expiresAt })
  persist()
  return { token, expiresAt }
}

export function findSession(token: string | undefined) {
  if (!token) return undefined
  return db.sessions.find((session) => session.token === token)
}

export function destroySession(token: string | undefined): void {
  if (!token) return
  db.sessions = db.sessions.filter((session) => session.token !== token)
  persist()
}

/** Forces the current session into the expired state (scenario switch). */
export function expireSessions(): void {
  const past = new Date(Date.now() - 1000).toISOString()
  db.sessions = db.sessions.map((session) => ({ ...session, expiresAt: past }))
  persist()
}

export function findUserById(userId: string): MockUser | undefined {
  return db.users.find((user) => user.id === userId)
}

export function findUserByEmail(email: string): MockUser | undefined {
  const normalized = email.trim().toLowerCase()
  return db.users.find((user) => user.email.toLowerCase() === normalized)
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export function findNft(idOrSlug: string): NftDetail | undefined {
  return db.nfts.find((nft) => nft.id === idOrSlug || nft.slug === idOrSlug)
}

export function toSummary(nft: NftDetail, favoriteIds: readonly string[]): NftSummary {
  return {
    id: nft.id,
    slug: nft.slug,
    name: nft.name,
    imageUrl: nft.imageUrl,
    imageAlt: nft.imageAlt,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    network: nft.network,
    category: nft.category,
    creator: nft.creator,
    collectionId: nft.collectionId,
    collectionName: nft.collectionName,
    available: nft.available,
    favorited: favoriteIds.includes(nft.id),
    rarity: nft.rarity,
    listedAt: nft.listedAt,
    trendingScore: nft.trendingScore,
    version: nft.version,
  }
}

/**
 * Applies a catalogue mutation, bumps the resource version and notifies the
 * realtime layer. Version is what lets the client discard stale events.
 */
export function mutateNft(nftId: string, mutate: (nft: NftDetail) => void): NftDetail | undefined {
  const nft = db.nfts.find((candidate) => candidate.id === nftId)
  if (!nft) return undefined
  mutate(nft)
  nft.available = nft.editions.reduce((sum, edition) => sum + edition.available, 0)
  nft.version += 1
  nft.updatedAt = new Date().toISOString()
  persist()
  emit({ type: 'nft.changed', nftId })
  return nft
}

/* ------------------------------------------------------------------ */
/* Favourites                                                          */
/* ------------------------------------------------------------------ */

export function favoritesOf(userId: string | null): string[] {
  if (!userId) return []
  return db.favorites[userId] ?? []
}

export function setFavorite(userId: string, nftId: string, favorited: boolean): void {
  const current = new Set(db.favorites[userId] ?? [])
  if (favorited) current.add(nftId)
  else current.delete(nftId)
  db.favorites[userId] = [...current]
  persist()
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export function findCart(userId: string | null, guestId: string | null): MockCart | undefined {
  if (userId) return db.carts.find((cart) => cart.userId === userId)
  if (guestId) return db.carts.find((cart) => cart.guestId === guestId)
  return undefined
}

export function ensureCart(userId: string | null, guestId: string | null): MockCart {
  const existing = findCart(userId, guestId)
  if (existing) return existing
  const cart: MockCart = {
    id: `cart_${crypto.randomUUID()}`,
    userId,
    guestId: userId ? null : guestId,
    items: [],
    couponCode: null,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
  db.carts.push(cart)
  persist()
  return cart
}

/**
 * On login the visitor's cart is folded into the account's cart: quantities are
 * summed and clamped to what is still available, so nothing silently vanishes.
 */
export function mergeGuestCart(userId: string, guestId: string | null): MockCart {
  const userCart = ensureCart(userId, null)
  const guestCart = guestId ? db.carts.find((cart) => cart.guestId === guestId) : undefined
  if (!guestCart || guestCart.id === userCart.id) return userCart

  for (const item of guestCart.items) {
    const existing = userCart.items.find(
      (candidate) => candidate.nftId === item.nftId && candidate.editionId === item.editionId,
    )
    const edition = findNft(item.nftId)?.editions.find((candidate) => candidate.id === item.editionId)
    const ceiling = Math.min(edition?.available ?? 0, edition?.maxPerOrder ?? 0)
    if (existing) {
      existing.quantity = Math.max(
        1,
        Math.min(existing.quantity + item.quantity, ceiling || existing.quantity),
      )
    } else {
      userCart.items.push({ ...item, id: `ci_${crypto.randomUUID()}` })
    }
  }

  userCart.couponCode = userCart.couponCode ?? guestCart.couponCode
  userCart.version += 1
  userCart.updatedAt = new Date().toISOString()
  db.carts = db.carts.filter((cart) => cart.id !== guestCart.id)
  persist()
  return userCart
}

export function findCoupon(code: string): Coupon | undefined {
  const normalized = code.trim().toUpperCase()
  return db.coupons.find((coupon) => coupon.code.toUpperCase() === normalized)
}

export function computeTotals(
  items: readonly CartItem[],
  coupon: Coupon | null,
  network: 'ethereum' | 'polygon' | 'solana' = 'ethereum',
): CartTotals {
  const subtotal = sumEth(items.map((item) => item.lineTotal))
  const discount = coupon
    ? percentOfEth(subtotal, coupon.discountBasisPoints)
    : ('0' as CartTotals['discount'])
  const networkFee = items.length
    ? (NETWORK_FEES[network] as CartTotals['networkFee'])
    : ('0' as CartTotals['networkFee'])
  const total = addEth(subEth(subtotal, discount), networkFee)
  return {
    subtotal,
    discount,
    networkFee,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

/** Projects the stored cart into the wire contract, re-pricing from the catalogue. */
export function projectCart(cart: MockCart): Cart {
  const items: CartItem[] = []

  for (const stored of cart.items) {
    const nft = findNft(stored.nftId)
    const edition = nft?.editions.find((candidate) => candidate.id === stored.editionId)
    if (!nft || !edition) continue

    const quantity = stored.quantity
    items.push({
      id: stored.id,
      nftId: nft.id,
      nftSlug: nft.slug,
      editionId: edition.id,
      name: nft.name,
      editionLabel: edition.label,
      imageUrl: nft.imageUrl,
      imageAlt: nft.imageAlt,
      network: nft.network,
      creatorName: nft.creator.name,
      quantity,
      unitPrice: edition.price,
      lineTotal: mulEth(edition.price, quantity),
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      priceChangedFrom:
        stored.addedUnitPrice !== edition.price ? (stored.addedUnitPrice as CartItem['unitPrice']) : null,
      unavailable: edition.available < quantity,
      nftVersion: nft.version,
    })
  }

  const coupon = cart.couponCode ? (findCoupon(cart.couponCode) ?? null) : null
  const network = items[0]?.network ?? 'ethereum'

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    coupon,
    totals: computeTotals(items, coupon, network),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

export function touchCart(cart: MockCart): void {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
  persist()
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function findOrder(orderId: string) {
  return db.orders.find((order) => order.id === orderId)
}

export function settleOrder(orderId: string, outcome: 'confirmed' | 'declined'): void {
  const order = findOrder(orderId)
  if (!order || order.status !== 'pending') return
  order.status = outcome
  order.version += 1
  order.updatedAt = new Date().toISOString()
  if (outcome === 'confirmed') {
    order.transactionHash =
      `0x${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '').slice(0, 32)}`.slice(
        0,
        66,
      )
    order.explorerUrl = `https://explorer.kurio.test/tx/${order.transactionHash}`
    order.declineReason = null
  } else {
    order.transactionHash = null
    order.explorerUrl = null
    order.declineReason = 'A carteira recusou a assinatura da transação.'
  }
  persist()
  emit({ type: 'order.changed', orderId, userId: order.userId })
}
