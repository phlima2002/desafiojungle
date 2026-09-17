import { z } from 'zod'
import { idSchema } from './common'
import { nftSummarySchema } from './nft'

export const favoritesResponseSchema = z.object({
  nftIds: z.array(idSchema),
  items: z.array(nftSummarySchema),
})
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>
