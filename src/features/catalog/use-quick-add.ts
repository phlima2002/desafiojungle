import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { nftsApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import type { NftDetail } from '@/shared/api/contracts'

/**
 * The catalogue only knows the summary, but adding to the cart needs an
 * edition. This resolves the detail through the same cache the detail page
 * uses, so the card's quick-add costs at most one request.
 */
export function useNftDetail(): (slug: string) => Promise<NftDetail> {
  const queryClient = useQueryClient()

  return useCallback(
    (slug: string) =>
      queryClient.ensureQueryData({
        queryKey: queryKeys.nfts.detail(slug),
        queryFn: ({ signal }) => nftsApi.detail(slug, signal),
        ...cachePolicy.detail,
      }),
    [queryClient],
  )
}
