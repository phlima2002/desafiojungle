import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { sessionApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import type { Session } from '@/shared/api/contracts'

/**
 * Guard for every private flow. It resolves the session through the same cache
 * the components read, so a protected route never renders before the session is
 * known, and an unauthenticated visit carries the intended destination into the
 * login screen for a seamless resume.
 */
export async function requireSession(queryClient: QueryClient, currentHref: string): Promise<Session> {
  const state = await queryClient
    .ensureQueryData({
      queryKey: queryKeys.session,
      queryFn: ({ signal }) => sessionApi.current(signal),
      ...cachePolicy.session,
    })
    .catch(() => null)

  if (!state?.authenticated) {
    // The intended destination rides along so the collector lands back where
    // they were after signing in — including mid-checkout.
    throw redirect({ to: '/entrar', search: { redirect: currentHref } })
  }

  return { user: state.user, expiresAt: state.expiresAt }
}
