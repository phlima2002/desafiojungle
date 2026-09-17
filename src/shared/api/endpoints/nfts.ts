import { request } from '../client'
import {
  featuredResponseSchema,
  nftDetailSchema,
  nftListResponseSchema,
  type NftListQuery,
} from '../contracts'

/** Serialises the typed query into the exact params the API receives. */
export function toNftListParams(query: NftListQuery): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {
    tab: query.tab,
    sort: query.sort,
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.q) params.q = query.q
  if (query.category?.length) params.category = query.category
  if (query.network?.length) params.network = query.network
  if (query.priceMin) params.priceMin = query.priceMin
  if (query.priceMax) params.priceMax = query.priceMax
  return params
}

export const nftsApi = {
  list: (query: NftListQuery, signal?: AbortSignal) =>
    request(nftListResponseSchema, {
      method: 'GET',
      url: '/nfts',
      params: toNftListParams(query),
      signal,
    }),

  detail: (idOrSlug: string, signal?: AbortSignal) =>
    request(nftDetailSchema, { method: 'GET', url: `/nfts/${encodeURIComponent(idOrSlug)}`, signal }),

  featured: (signal?: AbortSignal) =>
    request(featuredResponseSchema, { method: 'GET', url: '/nfts/featured', signal }),
}
