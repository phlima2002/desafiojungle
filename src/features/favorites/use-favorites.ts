import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { favoritesApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import type { FavoritesResponse, NftDetail, NftListResponse } from '@/shared/api/contracts'
import { useSession } from '@/features/session/use-session'

export function useFavoritesQuery() {
  const { session, scope } = useSession()
  return useQuery({
    queryKey: queryKeys.favorites(scope),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: Boolean(session),
    ...cachePolicy.favorites,
  })
}

/**
 * The reference optimistic interaction: the heart flips immediately, every
 * cached view of that NFT is patched, and a failure restores the exact previous
 * snapshots of all of them.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const favoritesKey = queryKeys.favorites(scope)

  return useMutation({
    mutationFn: ({ nftId, favorited }: { nftId: string; favorited: boolean }) =>
      favorited ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),

    onMutate: async ({ nftId, favorited }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: favoritesKey }),
        queryClient.cancelQueries({ queryKey: queryKeys.nfts.all }),
      ])

      const previousFavorites = queryClient.getQueryData<FavoritesResponse>(favoritesKey)
      const previousLists = queryClient.getQueriesData<NftListResponse>({
        queryKey: [...queryKeys.nfts.all, 'list'],
      })
      const previousDetail = queryClient.getQueryData<NftDetail>(queryKeys.nfts.detail(nftId))

      queryClient.setQueryData<FavoritesResponse>(favoritesKey, (current) =>
        current
          ? {
              nftIds: favorited
                ? [...new Set([...current.nftIds, nftId])]
                : current.nftIds.filter((id) => id !== nftId),
              items: favorited ? current.items : current.items.filter((item) => item.id !== nftId),
            }
          : current,
      )

      queryClient.setQueriesData<NftListResponse>({ queryKey: [...queryKeys.nfts.all, 'list'] }, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) => (item.id === nftId ? { ...item, favorited } : item)),
            }
          : current,
      )

      queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (current) =>
        current ? { ...current, favorited } : current,
      )

      return { previousFavorites, previousLists, previousDetail, nftId }
    },

    onError: (_error, _variables, context) => {
      if (!context) return
      if (context.previousFavorites) queryClient.setQueryData(favoritesKey, context.previousFavorites)
      for (const [key, value] of context.previousLists) queryClient.setQueryData(key, value)
      if (context.previousDetail) {
        queryClient.setQueryData(queryKeys.nfts.detail(context.nftId), context.previousDetail)
      }
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
  })
}
