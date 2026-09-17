const raw = import.meta.env

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

export const env = {
  apiBaseUrl: raw.VITE_API_BASE_URL ?? '/api',
  socketUrl: raw.VITE_SOCKET_URL ?? 'https://api.kurio.test',
  /** Mocks are on by default; the flag exists so a real backend can be plugged in. */
  enableMocks: flag(raw.VITE_ENABLE_MOCKS, true),
  /** Seed for the deterministic fixture generator. */
  mockSeed: Number(raw.VITE_MOCK_SEED ?? 20260917),
  isProd: raw.PROD,
  isDev: raw.DEV,
  isTest: flag(raw.VITE_TEST_MODE, false),
} as const
