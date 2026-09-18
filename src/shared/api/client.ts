import axios, { type AxiosRequestConfig, type AxiosInstance } from 'axios'
import type { z } from 'zod'
import { env } from '@/shared/config/env'
import { ApiError, normalizeError } from './errors'

/** Header the order mutation uses to make retries safe. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'
/** Correlates a client request with its entry in the mock server log. */
export const REQUEST_ID_HEADER = 'X-Request-Id'
/** Lets Playwright and the scenario switcher target one specific request. */
export const SCENARIO_HEADER = 'X-Mock-Scenario'

type SessionExpiredListener = () => void
const sessionExpiredListeners = new Set<SessionExpiredListener>()

/**
 * The transport layer cannot navigate; it announces the expiry and the router
 * layer decides where to send the collector (preserving the return URL).
 */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

function announceSessionExpired(): void {
  for (const listener of sessionExpiredListeners) listener()
}

/**
 * Gate that requests wait on before hitting the network. The mock layer sets it
 * so that the shell can render — and paint — before ~160 kB of service-worker
 * machinery is parsed, without any request escaping while it boots.
 */
let networkGate: Promise<unknown> | null = null

export function setNetworkGate(gate: Promise<unknown>): void {
  networkGate = gate
}

export function whenNetworkReady(): Promise<unknown> {
  return networkGate ?? Promise.resolve()
}

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  if (networkGate) await networkGate
  config.headers.set(REQUEST_ID_HEADER, crypto.randomUUID())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = normalizeError(error)
    if (apiError.code === 'SESSION_EXPIRED') announceSessionExpired()
    return Promise.reject(apiError)
  },
)

/**
 * Every call goes through here so that the response is validated against its
 * contract before it reaches the cache. A contract violation is a bug, not a
 * user-facing error: it fails loudly in dev and degrades to INTERNAL_ERROR in
 * production rather than poisoning the query cache with an unknown shape.
 */
export async function request<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  config: AxiosRequestConfig,
): Promise<z.infer<TSchema>> {
  const response = await http.request(config)
  const parsed = schema.safeParse(response.data)

  if (!parsed.success) {
    if (env.isDev) {
      console.error('[contract] resposta fora do contrato', {
        url: config.url,
        issues: parsed.error.issues,
        data: response.data,
      })
    }
    // Com os mocks ligados, uma resposta em HTML quase sempre quer dizer uma
    // coisa só: o service worker não interceptou e o servidor devolveu o
    // `index.html` do fallback de SPA. Dizer isso é bem mais útil do que falar
    // em contrato — é um problema do ambiente, com solução conhecida.
    const html = typeof response.data === 'string' && response.data.trimStart().startsWith('<')
    throw new ApiError({
      code: 'INTERNAL_ERROR',
      message:
        env.enableMocks && html
          ? 'O service worker que simula a API não está ativo. Limpe os dados do site (DevTools → Application → Storage → Clear site data) e recarregue.'
          : 'A resposta do servidor não corresponde ao contrato esperado.',
      status: response.status,
    })
  }

  return parsed.data
}

/** Same as `request` but for endpoints that answer 204 No Content. */
export async function requestVoid(config: AxiosRequestConfig): Promise<void> {
  await http.request(config)
}
