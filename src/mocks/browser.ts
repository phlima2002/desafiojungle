import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resetDatabase, db, mutateNft } from './db'
import { getScenarioName, setScenario, SCENARIOS, type ScenarioName } from './scenarios'
import { realtimeControls } from './socket/server'

export const worker = setupWorker(...handlers)

declare global {
  interface Window {
    __kurio?: typeof kurioControls
  }
}

/**
 * Public control surface for demos and E2E tests. Everything a scenario needs
 * to be reproducible lives here; no test ever reaches into React state.
 */
const kurioControls = {
  reset: () => resetDatabase(),
  setScenario: (name: ScenarioName) => setScenario(name),
  getScenario: () => getScenarioName(),
  scenarios: () =>
    Object.entries(SCENARIOS).map(([name, config]) => ({
      name,
      label: config.label,
      description: config.description,
    })),
  realtime: realtimeControls,
  /** Read-only peek used by assertions that need server truth. */
  inspect: () => ({
    orders: db.orders.map((order) => ({ id: order.id, status: order.status, userId: order.userId })),
    carts: db.carts.map((cart) => ({
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item) => ({
        nftId: item.nftId,
        editionId: item.editionId,
        quantity: item.quantity,
      })),
    })),
    nfts: db.nfts.length,
  }),

  /** Changes a catalogue price and emits the matching realtime event. */
  setNftPrice: (nftId: string, price: string) => {
    mutateNft(nftId, (nft) => {
      const edition = nft.editions[0]
      if (!edition) return
      edition.price = price
      nft.price = price
    })
  },

  setEditionAvailability: (nftId: string, editionId: string, available: number) => {
    mutateNft(nftId, (nft) => {
      const edition = nft.editions.find((candidate) => candidate.id === editionId)
      if (edition) edition.available = available
    })
  },
}

export async function startMockServer(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  window.__kurio = kurioControls
}
