const raw = import.meta.env

/**
 * Uma variável declarada e vazia conta como não declarada.
 *
 * Painéis de deploy deixam criar a chave sem preencher o valor, e foi o que
 * derrubou a publicação na Vercel: `VITE_ENABLE_MOCKS` chegava como `''`, que
 * não é `'true'`, e a camada de mocks não subia — a aplicação ia buscar uma API
 * que não existe. `VITE_API_BASE_URL` vazio fazia o mesmo estrago por outro
 * caminho, porque `''` não é nulo e passava direto pelo `??`.
 *
 * O padrão do código é o que o desafio precisa; a variável só existe para
 * apontar a aplicação para um backend de verdade. Vazia, ela não quer dizer
 * nada — e é assim que passa a ser lida.
 */
function value(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

function flag(raw: string | undefined, fallback: boolean): boolean {
  const parsed = value(raw)
  if (parsed === undefined) return fallback
  return parsed === 'true' || parsed === '1'
}

export const env = {
  /** `/` na raiz, `/repo/` quando publicado em subcaminho (ver vite.config.ts). */
  basePath: raw.BASE_URL,
  /**
   * Prefixo das chamadas REST. Ele segue o `base` de propósito: o service worker
   * do MSW só intercepta dentro do seu escopo, e num subcaminho um `/api`
   * absoluto ficaria de fora.
   */
  apiBaseUrl: value(raw.VITE_API_BASE_URL) ?? `${raw.BASE_URL}api`,
  socketUrl: value(raw.VITE_SOCKET_URL) ?? 'https://api.kurio.test',
  /** Mocks are on by default; the flag exists so a real backend can be plugged in. */
  enableMocks: flag(raw.VITE_ENABLE_MOCKS, true),
  /** Seed for the deterministic fixture generator. */
  mockSeed: Number(value(raw.VITE_MOCK_SEED) ?? 20260917),
  isProd: raw.PROD,
  isDev: raw.DEV,
  isTest: flag(raw.VITE_TEST_MODE, false),
} as const
