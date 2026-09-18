const raw = import.meta.env

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

export const env = {
  /** `/` na raiz, `/repo/` quando publicado em subcaminho (ver vite.config.ts). */
  basePath: raw.BASE_URL,
  /**
   * Prefixo das chamadas REST. Ele segue o `base` de propósito: o service worker
   * do MSW só intercepta dentro do seu escopo, e num subcaminho um `/api`
   * absoluto ficaria de fora.
   */
  apiBaseUrl: raw.VITE_API_BASE_URL ?? `${raw.BASE_URL}api`,
  socketUrl: raw.VITE_SOCKET_URL ?? 'https://api.kurio.test',
  /** Mocks are on by default; the flag exists so a real backend can be plugged in. */
  enableMocks: flag(raw.VITE_ENABLE_MOCKS, true),
  /** Seed for the deterministic fixture generator. */
  mockSeed: Number(raw.VITE_MOCK_SEED ?? 20260917),
  isProd: raw.PROD,
  isDev: raw.DEV,
  isTest: flag(raw.VITE_TEST_MODE, false),
} as const
