import { request, requestVoid } from '../client'
import { favoritesResponseSchema } from '../contracts'

export const favoritesApi = {
  list: (signal?: AbortSignal) =>
    request(favoritesResponseSchema, { method: 'GET', url: '/favorites', signal }),

  add: (nftId: string) => requestVoid({ method: 'PUT', url: `/favorites/${encodeURIComponent(nftId)}` }),

  remove: (nftId: string) =>
    requestVoid({ method: 'DELETE', url: `/favorites/${encodeURIComponent(nftId)}` }),
}
