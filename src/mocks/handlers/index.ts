import { accountHandlers } from './account'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'
import { devHandlers } from './dev'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { sessionHandlers } from './session'
import { socketHandlers } from '../socket/server'

export const handlers = [
  ...socketHandlers,
  ...devHandlers,
  ...sessionHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...accountHandlers,
]
