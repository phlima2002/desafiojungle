import { setupWorker } from 'msw/browser'
import { env } from '@/shared/config/env'
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

/**
 * Um service worker de *outro* projeto registrado na mesma origem — o que
 * acontece o tempo todo em `localhost`, porta compartilhada por todo projeto
 * Vite — intercepta as chamadas antes do nosso, e a aplicação abre dizendo que
 * a resposta não bate com o contrato. Em vez de exigir um "limpar dados do
 * site" manual, o boot desregistra quem não é daqui antes de instalar o nosso.
 *
 * Sem recarregar a página: o worker do MSW chama `clients.claim()` ao ativar, e
 * assume o controle da aba por conta própria. Um `location.reload()` aqui
 * abortaria qualquer navegação em curso — inclusive a que acabou de trazer a
 * pessoa até esta tela.
 */
async function evictForeignWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const expected = new URL(`${import.meta.env.BASE_URL}mockServiceWorker.js`, location.origin).href

  const foreign = (await navigator.serviceWorker.getRegistrations()).filter((registration) => {
    const script = registration.active ?? registration.waiting ?? registration.installing
    return script ? script.scriptURL !== expected : false
  })

  await Promise.all(foreign.map((registration) => registration.unregister()))
}

/**
 * Um service worker recém-instalado chama `clients.claim()` ao ativar, mas o
 * controle não passa para a aba no mesmo instante: `navigator.serviceWorker
 * .controller` continua nulo por alguns milissegundos. É nessa janela que o MSW
 * tenta avisar o worker de que os mocks estão ativos — e, sem controlador, o
 * aviso não chega a lugar nenhum.
 *
 * O sintoma é o da primeira visita: numa aba anônima, num computador novo ou na
 * primeira vez num domínio recém-publicado, a página sobe, o gate abre, e as
 * chamadas passam direto pela rede — onde `/api/...` é só o `index.html` do
 * fallback de SPA. Na segunda visita o worker já está instalado e controlando
 * desde o primeiro byte, e tudo funciona: por isso o erro nunca aparecia aqui.
 */
async function waitForController(timeoutMs = 3_000): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  if (navigator.serviceWorker.controller) return true

  return new Promise<boolean>((resolve) => {
    const finish = (value: boolean) => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      window.clearTimeout(timer)
      resolve(value)
    }
    const onChange = () => finish(true)
    const timer = window.setTimeout(() => finish(Boolean(navigator.serviceWorker.controller)), timeoutMs)
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
  })
}

/**
 * Prova de que a interceptação está de pé, feita contra o plano de controle dos
 * próprios mocks: se a resposta vier em JSON, o worker está respondendo; se vier
 * o HTML do fallback, não está. É a única verificação que não depende de supor
 * o estado do `ServiceWorkerRegistration`.
 */
async function intercepting(): Promise<boolean> {
  try {
    const response = await fetch(`${env.apiBaseUrl}/__mock__/scenario`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    return response.ok && (response.headers.get('content-type') ?? '').includes('application/json')
  } catch {
    return false
  }
}

const RELOAD_KEY = 'kurio.mock.reload'

export async function startMockServer(): Promise<void> {
  try {
    await evictForeignWorkers()
  } catch {
    // API indisponível ou bloqueada: segue o boot normal.
  }

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })

  await waitForController()

  /**
   * Se mesmo assim a interceptação não estiver de pé, uma recarga resolve: o
   * worker já está instalado, e na próxima navegação ele controla a aba desde
   * o primeiro byte. A chave na `sessionStorage` garante que isso aconteça no
   * máximo uma vez por aba — um laço de recargas seria pior que o erro.
   *
   * A promessa que nunca resolve mantém o network gate fechado enquanto a
   * recarga acontece: nenhuma chamada escapa para a rede no meio do caminho.
   */
  if (!(await intercepting())) {
    let retried = true
    try {
      retried = window.sessionStorage.getItem(RELOAD_KEY) === '1'
      window.sessionStorage.setItem(RELOAD_KEY, '1')
    } catch {
      // Modo privado com armazenamento bloqueado: sem contador, sem recarga.
    }
    if (!retried) {
      location.reload()
      await new Promise<never>(() => {})
    }
  } else {
    try {
      window.sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      /* nada a limpar */
    }
  }

  window.__kurio = kurioControls
  resumePendingOrders()
}
