import { createFileRoute, notFound } from '@tanstack/react-router'
import { nftsApi } from '@/shared/api/endpoints'
import { queryKeys, cachePolicy } from '@/shared/api/query-keys'
import { isApiError } from '@/shared/api/errors'
import { NftDetailPage } from '@/features/nft/nft-detail-page'
import { NftDetailSkeleton } from '@/features/nft/nft-detail-skeleton'

export const Route = createFileRoute('/nft/$slug')({
  // Direct access and refresh must work: the loader primes the cache before the
  // component renders, and a missing NFT resolves to the 404 boundary.
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData({
        queryKey: queryKeys.nfts.detail(params.slug),
        queryFn: ({ signal }) => nftsApi.detail(params.slug, signal),
        ...cachePolicy.detail,
      })
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  pendingComponent: NftDetailSkeleton,
  component: NftDetailRoute,
})

function NftDetailRoute() {
  const { slug } = Route.useParams()
  return <NftDetailPage slug={slug} />
}
