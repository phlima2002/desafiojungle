import { QueryClient, type QueryCache } from '@tanstack/react-query'
import { QueryCache as Cache, MutationCache } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/errors'

/**
 * Retry policy: only transient transport failures are retried, and never more
 * than twice. A 4xx is a decision by the server — retrying it would duplicate
 * work and hide the real problem from the collector.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false
  if (!isApiError(error)) return false
  return error.isTransient
}

export type AppQueryCache = QueryCache

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new Cache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 4_000),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Structural sharing keeps object identity stable across refetches so
        // that unchanged rows do not re-render while a page is updating.
        structuralSharing: true,
        throwOnError: false,
      },
      mutations: {
        // Mutations are never retried automatically: the order mutation is the
        // only safely repeatable one and it retries explicitly with its
        // idempotency key.
        retry: false,
      },
    },
  })
}
