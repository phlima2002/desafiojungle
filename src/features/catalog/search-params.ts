import { z } from 'zod'
import {
  categorySchema,
  ethAmountSchema,
  networkSchema,
  nftSortSchema,
  nftTabSchema,
  type NftListQuery,
} from '@/shared/api/contracts'

export const PAGE_SIZE = 9

/**
 * The URL is the single source of truth for the catalogue. Everything the
 * collector can change — query, tab, filters, sort and page — round-trips
 * through the address bar, so refresh, back/forward and sharing a link all
 * restore the exact same view.
 */
/** Accepts a single repeated key or many, and always yields an array. */
function listParam<T extends z.ZodTypeAny>(item: T) {
  return z
    .union([z.array(item), item])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional()
    .catch(undefined)
}

export const catalogSearchSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  tab: nftTabSchema.catch('all').optional(),
  categoria: listParam(categorySchema),
  rede: listParam(networkSchema),
  min: ethAmountSchema.optional().catch(undefined),
  max: ethAmountSchema.optional().catch(undefined),
  ordenar: nftSortSchema.catch('recent').optional(),
  pagina: z.coerce.number().int().positive().catch(1).optional(),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function toListQuery(search: CatalogSearch): NftListQuery {
  return {
    q: search.q,
    tab: search.tab ?? 'all',
    category: search.categoria,
    network: search.rede,
    priceMin: search.min,
    priceMax: search.max,
    sort: search.ordenar ?? 'recent',
    page: search.pagina ?? 1,
    pageSize: PAGE_SIZE,
  }
}

/** Any filter change resets pagination — page 2 of a different result set is meaningless. */
export function withFilter(search: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  const next = { ...search, ...patch }
  if (!('pagina' in patch)) next.pagina = undefined
  for (const key of Object.keys(next) as Array<keyof CatalogSearch>) {
    const value = next[key]
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key]
  }
  return next
}

export function toggleInList<T extends string>(list: readonly T[] | undefined, value: T): T[] | undefined {
  const current = list ?? []
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  return next.length ? next : undefined
}
