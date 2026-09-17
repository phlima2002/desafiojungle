/**
 * Scenarios are named, reproducible presets that configure the mock network and
 * business behaviour. They are selected with `?scenario=<name>`, persisted in
 * localStorage, switched at runtime through `window.__kurio.setScenario(name)`
 * and can be overridden per request with the `X-Mock-Scenario` header.
 */
export interface ScenarioConfig {
  readonly label: string
  readonly description: string
  /** Latency window in milliseconds; a range produces variable latency. */
  readonly latency: readonly [min: number, max: number]
  /** Probability (0..1) that a GET resolves out of the order it was issued. */
  readonly outOfOrder: number
  /** Probability that any request fails with a connection error. */
  readonly connectionFailureRate: number
  /** Probability that any request answers 503. */
  readonly serverErrorRate: number
  /** Forces the catalogue to answer with zero results. */
  readonly emptyCatalogue: boolean
  /** Session endpoints answer SESSION_EXPIRED. */
  readonly sessionExpired: boolean
  /** Favourite mutations always fail (used to prove optimistic rollback). */
  readonly favoritesMutationFails: boolean
  /** Any coupon answers COUPON_EXPIRED. */
  readonly couponExpired: boolean
  /** The quote reports a price change for the first line. */
  readonly quotePriceChanged: boolean
  /** The quote reports the first line as sold out. */
  readonly quoteSoldOut: boolean
  /** POST /orders creates the order but never answers (client times out). */
  readonly orderResponseTimeout: boolean
  /** Terminal state the payment simulation resolves to. */
  readonly paymentOutcome: 'confirmed' | 'declined'
  /** Delay before the order.updated terminal event is emitted. */
  readonly paymentSettleMs: number
  /** Emits a duplicate and a stale event after each nft.updated. */
  readonly emitDuplicateEvents: boolean
}

const base: ScenarioConfig = {
  label: 'Padrão',
  description: 'Fluxo feliz com latência curta e realista.',
  latency: [80, 260],
  outOfOrder: 0,
  connectionFailureRate: 0,
  serverErrorRate: 0,
  emptyCatalogue: false,
  sessionExpired: false,
  favoritesMutationFails: false,
  couponExpired: false,
  quotePriceChanged: false,
  quoteSoldOut: false,
  orderResponseTimeout: false,
  paymentOutcome: 'confirmed',
  paymentSettleMs: 1800,
  emitDuplicateEvents: false,
}

export const SCENARIOS = {
  default: base,

  instant: {
    ...base,
    label: 'Instantâneo',
    description: 'Sem latência — usado pelos testes E2E e pela auditoria Lighthouse.',
    latency: [0, 0],
    paymentSettleMs: 150,
  },

  'empty-results': {
    ...base,
    label: 'Resultado vazio',
    description: 'O catálogo responde 200 com zero itens.',
    emptyCatalogue: true,
  },

  'slow-network': {
    ...base,
    label: 'Rede lenta',
    description: 'Latência de 2,5 s para observar skeletons e estados de carregamento.',
    latency: [2200, 2800],
  },

  'variable-latency': {
    ...base,
    label: 'Latência variável',
    description: 'Latência de 120 ms a 2,4 s com respostas fora de ordem.',
    latency: [120, 2400],
    outOfOrder: 0.5,
  },

  offline: {
    ...base,
    label: 'Sem conexão',
    description: 'Todas as requisições falham por erro de conexão.',
    connectionFailureRate: 1,
  },

  'flaky-network': {
    ...base,
    label: 'Rede instável',
    description: '35% das requisições falham por conexão ou 503.',
    latency: [200, 900],
    connectionFailureRate: 0.2,
    serverErrorRate: 0.15,
  },

  'server-error': {
    ...base,
    label: 'Erro do servidor',
    description: 'Todas as requisições respondem 503.',
    serverErrorRate: 1,
  },

  'session-expired': {
    ...base,
    label: 'Sessão expirada',
    description: 'A sessão expira e os fluxos privados exigem novo login.',
    sessionExpired: true,
  },

  'favorites-fail': {
    ...base,
    label: 'Favorito falha',
    description: 'A mutation de favoritos falha — exercita o rollback otimista.',
    favoritesMutationFails: true,
  },

  'coupon-expired': {
    ...base,
    label: 'Cupom expirado',
    description: 'Qualquer cupom responde COUPON_EXPIRED.',
    couponExpired: true,
  },

  'price-changed': {
    ...base,
    label: 'Preço alterado na compra',
    description: 'A cotação acusa mudança de preço e exige nova confirmação.',
    quotePriceChanged: true,
  },

  'edition-sold-out': {
    ...base,
    label: 'Edição esgotada',
    description: 'A cotação acusa edição esgotada durante o checkout.',
    quoteSoldOut: true,
  },

  'order-timeout': {
    ...base,
    label: 'Timeout após criar o pedido',
    description: 'O pedido é criado mas a resposta nunca chega; a retomada usa a chave de idempotência.',
    orderResponseTimeout: true,
  },

  'payment-declined': {
    ...base,
    label: 'Pagamento recusado',
    description: 'O pedido é criado como pendente e termina recusado.',
    paymentOutcome: 'declined',
  },

  'duplicate-events': {
    ...base,
    label: 'Eventos duplicados e antigos',
    description: 'Cada evento é reenviado duplicado e com versão anterior.',
    emitDuplicateEvents: true,
  },
} as const satisfies Record<string, ScenarioConfig>

export type ScenarioName = keyof typeof SCENARIOS
export const SCENARIO_NAMES = Object.keys(SCENARIOS) as ScenarioName[]
export const DEFAULT_SCENARIO: ScenarioName = 'default'

const STORAGE_KEY = 'kurio.mock.scenario'

function readStoredScenario(): ScenarioName {
  if (typeof window === 'undefined') return DEFAULT_SCENARIO
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (fromUrl && fromUrl in SCENARIOS) {
    window.localStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl as ScenarioName
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && stored in SCENARIOS ? (stored as ScenarioName) : DEFAULT_SCENARIO
}

let current: ScenarioName = readStoredScenario()
const listeners = new Set<(name: ScenarioName) => void>()

export function getScenarioName(): ScenarioName {
  return current
}

export function getScenario(override?: string | null): ScenarioConfig {
  if (override && override in SCENARIOS) return SCENARIOS[override as ScenarioName]
  return SCENARIOS[current]
}

export function setScenario(name: ScenarioName): void {
  if (!(name in SCENARIOS)) throw new Error(`Cenário desconhecido: ${name}`)
  current = name
  try {
    window.localStorage.setItem(STORAGE_KEY, name)
  } catch {
    /* private mode — the scenario stays in memory only */
  }
  for (const listener of listeners) listener(name)
}

export function onScenarioChange(listener: (name: ScenarioName) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
