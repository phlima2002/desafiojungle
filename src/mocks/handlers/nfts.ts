import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import {
  categorySchema,
  networkSchema,
  nftListQuerySchema,
  nftSortSchema,
  nftTabSchema,
  type Facet,
  type NftDetail,
  type NftListQuery,
  type NftSummary,
} from '@/shared/api/contracts'
import { compareEth } from '@/shared/lib/money'
import { db, favoritesOf, findNft, toSummary } from '../db'
import { CATEGORY_LABELS, CATEGORY_ORDER, NETWORK_LABELS, NETWORK_ORDER } from '../fixtures/catalog'
import { applyNetworkConditions, errorResponse, scenarioFor } from '../network'
import { readContext, type Cookies } from './context'

const base = env.apiBaseUrl

function parseQuery(url: URL): NftListQuery {
  const params = url.searchParams
  const categories = params.getAll('category').filter((value) => categorySchema.safeParse(value).success)
  const networks = params.getAll('network').filter((value) => networkSchema.safeParse(value).success)

  return nftListQuerySchema.parse({
    q: params.get('q') ?? undefined,
    tab: nftTabSchema.safeParse(params.get('tab')).success ? params.get('tab') : 'all',
    category: categories.length ? categories : undefined,
    network: networks.length ? networks : undefined,
    priceMin: params.get('priceMin') ?? undefined,
    priceMax: params.get('priceMax') ?? undefined,
    sort: nftSortSchema.safeParse(params.get('sort')).success ? params.get('sort') : 'recent',
    page: Number(params.get('page') ?? 1),
    pageSize: Number(params.get('pageSize') ?? 9),
  })
}

const NEW_WINDOW_MS = 72 * 3600_000

function matches(nft: NftDetail, query: NftListQuery, newestListedAt: number): boolean {
  if (query.q) {
    const needle = query.q.toLowerCase()
    const haystack = `${nft.name} ${nft.creator.name} ${nft.collectionName}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (query.category?.length && !query.category.includes(nft.category)) return false
  if (query.network?.length && !query.network.includes(nft.network)) return false
  if (query.priceMin && compareEth(nft.price, query.priceMin) < 0) return false
  if (query.priceMax && compareEth(nft.price, query.priceMax) > 0) return false
  if (query.tab === 'new' && newestListedAt - new Date(nft.listedAt).getTime() > NEW_WINDOW_MS) return false
  if (query.tab === 'trending' && nft.trendingScore < 60) return false
  return true
}

function sortItems(items: readonly NftSummary[], sort: NftListQuery['sort']): NftSummary[] {
  // Every comparator falls back to the id so that equal keys keep a stable,
  // reproducible order across pages and across runs.
  switch (sort) {
    case 'price-asc':
      return items.toSorted((a, b) => compareEth(a.price, b.price) || a.id.localeCompare(b.id))
    case 'price-desc':
      return items.toSorted((a, b) => compareEth(b.price, a.price) || a.id.localeCompare(b.id))
    case 'trending':
      return items.toSorted((a, b) => b.trendingScore - a.trendingScore || a.id.localeCompare(b.id))
    case 'name-asc':
      return items.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    case 'recent':
    default:
      return items.toSorted(
        (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime() || a.id.localeCompare(b.id),
      )
  }
}

function buildFacets(pool: readonly NftDetail[]): { categories: Facet[]; networks: Facet[] } {
  const categories = CATEGORY_ORDER.map<Facet>((value) => ({
    value,
    label: CATEGORY_LABELS[value],
    count: pool.filter((nft) => nft.category === value).length,
  }))
  const networks = NETWORK_ORDER.map<Facet>((value) => ({
    value,
    label: NETWORK_LABELS[value],
    count: pool.filter((nft) => nft.network === value).length,
  }))
  return { categories, networks }
}

export const nftHandlers = [
  http.get(`${base}/nfts/featured`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const context = readContext(cookies as Cookies)
    const favorites = favoritesOf(context.user?.id ?? null)
    const pool = db.nfts.toSorted((a, b) => b.trendingScore - a.trendingScore)

    return HttpResponse.json({
      hero: pool.slice(0, 3).map((nft) => toSummary(nft, favorites)),
      spotlight: toSummary(pool[3] ?? db.nfts[0]!, favorites),
    })
  }),

  http.get(`${base}/nfts`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const scenario = scenarioFor(request)
    const url = new URL(request.url)

    let query: NftListQuery
    try {
      query = parseQuery(url)
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Parâmetros de busca inválidos.')
    }

    const context = readContext(cookies as Cookies)
    const favorites = favoritesOf(context.user?.id ?? null)
    const newestListedAt = db.nfts.reduce((max, nft) => Math.max(max, new Date(nft.listedAt).getTime()), 0)

    const filtered = scenario.emptyCatalogue
      ? []
      : db.nfts.filter((nft) => matches(nft, query, newestListedAt))

    const sorted = sortItems(
      filtered.map((nft) => toSummary(nft, favorites)),
      query.sort,
    )

    const total = sorted.length
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
    const page = Math.min(query.page, totalPages)
    const start = (page - 1) * query.pageSize

    // Facets are computed over everything but the facet's own dimension, so
    // that selecting a category still shows the other categories' counts.
    const facetPool = scenario.emptyCatalogue
      ? []
      : db.nfts.filter((nft) =>
          matches(nft, { ...query, category: undefined, network: undefined }, newestListedAt),
        )
    const facets = buildFacets(facetPool)

    const prices = db.nfts.map((nft) => nft.price).toSorted(compareEth)

    return HttpResponse.json({
      items: sorted.slice(start, start + query.pageSize),
      pagination: { page, pageSize: query.pageSize, total, totalPages },
      facets: {
        ...facets,
        priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
      },
      appliedQuery: { ...query, page },
    })
  }),

  http.get(`${base}/nfts/:idOrSlug`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const nft = findNft(String(params.idOrSlug))
    if (!nft) {
      return errorResponse('NOT_FOUND', 'Este NFT não existe ou saiu do catálogo.')
    }

    const context = readContext(cookies as Cookies)
    const favorites = favoritesOf(context.user?.id ?? null)
    return HttpResponse.json({ ...nft, favorited: favorites.includes(nft.id) })
  }),
]
