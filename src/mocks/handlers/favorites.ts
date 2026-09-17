import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import { db, favoritesOf, findNft, setFavorite, toSummary } from '../db'
import { applyNetworkConditions, errorResponse, scenarioFor } from '../network'
import { isResponse, readContext, requireUser, type Cookies } from './context'

const base = env.apiBaseUrl

export const favoriteHandlers = [
  http.get(`${base}/favorites`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const ids = favoritesOf(user.id)
    return HttpResponse.json({
      nftIds: ids,
      items: db.nfts.filter((nft) => ids.includes(nft.id)).map((nft) => toSummary(nft, ids)),
    })
  }),

  http.put(`${base}/favorites/:nftId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    if (scenarioFor(request).favoritesMutationFails) {
      return errorResponse('TRANSIENT_FAILURE', 'Não foi possível salvar o favorito. Tente de novo.')
    }
    if (!findNft(String(params.nftId))) {
      return errorResponse('NOT_FOUND', 'Este NFT não existe.')
    }

    setFavorite(user.id, String(params.nftId), true)
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(`${base}/favorites/:nftId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    if (scenarioFor(request).favoritesMutationFails) {
      return errorResponse('TRANSIENT_FAILURE', 'Não foi possível remover o favorito. Tente de novo.')
    }

    setFavorite(user.id, String(params.nftId), false)
    return new HttpResponse(null, { status: 204 })
  }),
]
