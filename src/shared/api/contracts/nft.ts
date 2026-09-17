import { z } from 'zod'
import { ethAmountSchema, idSchema, isoDateTimeSchema, pagedSchema, versionSchema } from './common'

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>

export const categorySchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
])
export type Category = z.infer<typeof categorySchema>

export const creatorSchema = z.object({
  id: idSchema,
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string(),
  verified: z.boolean(),
})
export type Creator = z.infer<typeof creatorSchema>

/**
 * An "edition" is a purchasable variant of an NFT (1/1, série de 50, …).
 * Availability is tracked per edition; the detail page disables an edition that
 * is sold out and caps the quantity stepper at `available`.
 */
export const editionSchema = z.object({
  id: idSchema,
  label: z.string(),
  supply: z.number().int().positive(),
  available: z.number().int().nonnegative(),
  /** Per-unit price. May differ from the NFT's headline price. */
  price: ethAmountSchema,
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: idSchema,
  slug: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  price: ethAmountSchema,
  /** Present when the NFT is discounted; rendered struck-through in the card. */
  compareAtPrice: ethAmountSchema.nullable(),
  network: networkSchema,
  category: categorySchema,
  creator: creatorSchema,
  collectionId: idSchema,
  collectionName: z.string(),
  available: z.number().int().nonnegative(),
  favorited: z.boolean(),
  listedAt: isoDateTimeSchema,
  trendingScore: z.number(),
  version: versionSchema,
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  gallery: z.array(z.object({ url: z.string(), alt: z.string() })).min(1),
  editions: z.array(editionSchema).min(1),
  contractAddress: z.string(),
  tokenId: z.string(),
  royaltiesBasisPoints: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  attributes: z.array(z.object({ trait: z.string(), value: z.string() })),
  updatedAt: isoDateTimeSchema,
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const nftSortSchema = z.enum([
  'recent', // "Listados recentemente"
  'price-asc',
  'price-desc',
  'trending',
  'name-asc',
])
export type NftSort = z.infer<typeof nftSortSchema>

export const nftTabSchema = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof nftTabSchema>

/**
 * Catalogue query. Mirrors the URL search params one-for-one so that the
 * address bar is the single source of truth for search, filters, sort and page.
 */
export const nftListQuerySchema = z.object({
  q: z.string().trim().optional(),
  tab: nftTabSchema.default('all'),
  category: z.array(categorySchema).optional(),
  network: z.array(networkSchema).optional(),
  priceMin: ethAmountSchema.optional(),
  priceMax: ethAmountSchema.optional(),
  sort: nftSortSchema.default('recent'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(48).default(9),
})
export type NftListQuery = z.infer<typeof nftListQuerySchema>

export const facetSchema = z.object({ value: z.string(), label: z.string(), count: z.number().int() })
export type Facet = z.infer<typeof facetSchema>

export const nftListResponseSchema = pagedSchema(nftSummarySchema).extend({
  facets: z.object({
    categories: z.array(facetSchema),
    networks: z.array(facetSchema),
    priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
  }),
  /** Echo of the parameters the server actually applied. */
  appliedQuery: nftListQuerySchema,
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const featuredResponseSchema = z.object({
  hero: z.array(nftSummarySchema).min(1),
  spotlight: nftSummarySchema,
})
export type FeaturedResponse = z.infer<typeof featuredResponseSchema>
