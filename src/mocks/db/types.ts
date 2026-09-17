import type { Cart, CollectorDetails, Coupon, NftDetail, Order, Quote, Wallet } from '@/shared/api/contracts'

export interface MockUser {
  id: string
  name: string
  displayName: string
  email: string
  password: string
  avatarUrl: string | null
  bio: string
  website: string
  location: string
  createdAt: string
}

export interface MockSession {
  token: string
  userId: string
  expiresAt: string
}

export interface MockCart {
  id: string
  userId: string | null
  guestId: string | null
  items: Array<{ id: string; nftId: string; editionId: string; quantity: number; addedUnitPrice: string }>
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface MockOrder extends Order {
  userId: string
}

export interface MockDatabase {
  schemaVersion: number
  users: MockUser[]
  sessions: MockSession[]
  nfts: NftDetail[]
  favorites: Record<string, string[]>
  carts: MockCart[]
  wallets: Record<string, Wallet[]>
  quotes: Quote[]
  orders: MockOrder[]
  idempotency: Record<string, { fingerprint: string; orderId: string }>
  coupons: Coupon[]
  lastCollector: Record<string, CollectorDetails>
}

export type { Cart, Quote }
