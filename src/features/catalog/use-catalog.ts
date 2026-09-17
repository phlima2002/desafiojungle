import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { nftsApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import type { NftListQuery } from '@/shared/api/contracts'

export function useCatalogQuery(query: NftListQuery) {
  return useQuery({
    queryKey: queryKeys.nfts.list(query),
    // AbortSignal comes from Query: switching pages or filters cancels the
    // in-flight request, so an out-of-order answer can never overwrite a newer
    // one.
    queryFn: ({ signal }) => nftsApi.list(query, signal),
    placeholderData: keepPreviousData,
    ...cachePolicy.catalogue,
  })
}

export function useFeaturedQuery() {
  return useQuery({
    queryKey: queryKeys.nfts.featured(),
    queryFn: ({ signal }) => nftsApi.featured(signal),
    ...cachePolicy.catalogue,
  })
}

export function useNftDetailQuery(idOrSlug: string) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(idOrSlug),
    queryFn: ({ signal }) => nftsApi.detail(idOrSlug, signal),
    ...cachePolicy.detail,
  })
}
