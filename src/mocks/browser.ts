import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resetDatabase, db, mutateNft, settleOrder } from './db'
import { getScenario, getScenarioName, setScenario, SCENARIOS, type ScenarioName } from './scenarios'
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

/**
 * A pending order is settled by a timer that lives in the page, so a refresh or
 * a dropped connection would otherwise leave it pending forever. On every boot
 * the simulated server picks those orders back up — the same way a real backend
 * keeps working while the browser is away — which is what makes the "recover a
 * pending order after refresh" flow deterministic.
 */
function resumePendingOrders(): void {
  const scenario = getScenario()
  for (const order of db.orders) {
    if (order.status !== 'pending') continue
    window.setTimeout(() => settleOrder(order.id, scenario.paymentOutcome), scenario.paymentSettleMs)
  }
}

export async function startMockServer(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  window.__kurio = kurioControls
  resumePendingOrders()
}
