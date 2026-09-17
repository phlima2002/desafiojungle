import type { NftListQuery } from './contracts'

/**
 * Every private resource is namespaced by the owning user id. Two collectors
 * can therefore never read each other's cache entries, and switching users is
 * a key change rather than a manual invalidation.
 */
export type Scope = string | 'guest'

export const queryKeys = {
  session: ['session'] as const,

  nfts: {
    all: ['nfts'] as const,
    featured: () => [...queryKeys.nfts.all, 'featured'] as const,
    list: (query: NftListQuery) => [...queryKeys.nfts.all, 'list', query] as const,
    detail: (idOrSlug: string) => [...queryKeys.nfts.all, 'detail', idOrSlug] as const,
  },

  favorites: (scope: Scope) => ['favorites', scope] as const,
  cart: (scope: Scope) => ['cart', scope] as const,

  quote: (scope: Scope, quoteId: string) => ['quote', scope, quoteId] as const,
  order: (scope: Scope, orderId: string) => ['order', scope, orderId] as const,

  profile: (scope: Scope) => ['profile', scope] as const,
  wallets: (scope: Scope) => ['wallets', scope] as const,
} as const

/** Cache policy, kept in one place so ARCHITECTURE.md can point at it. */
export const cachePolicy = {
  /** Catalogue pages churn with realtime price updates: short staleness. */
  catalogue: { staleTime: 30_000, gcTime: 5 * 60_000 },
  detail: { staleTime: 60_000, gcTime: 10 * 60_000 },
  /** The session drives every guard — refetch on focus, keep it warm. */
  session: { staleTime: 60_000, gcTime: 30 * 60_000 },
  /** The cart is user-visible money: always revalidate on mount. */
  cart: { staleTime: 0, gcTime: 5 * 60_000 },
  favorites: { staleTime: 30_000, gcTime: 10 * 60_000 },
  /** A pending order is polled until a terminal state arrives. */
  order: { staleTime: 0, gcTime: 30 * 60_000 },
  account: { staleTime: 60_000, gcTime: 10 * 60_000 },
} as const
