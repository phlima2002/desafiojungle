import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys, type Scope } from '@/shared/api/query-keys'
import { isApiError } from '@/shared/api/errors'
import type { LoginRequest, RegisterRequest, Session } from '@/shared/api/contracts'

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => sessionApi.current(signal),
    ...cachePolicy.session,
    refetchOnWindowFocus: true,
    retry: (count, error) => count < 2 && isApiError(error) && error.isTransient,
  })
}

export function useSession(): {
  session: Session | null
  scope: Scope
  isPending: boolean
  /** True when a session existed and lapsed, so the UI can offer to resume. */
  expired: boolean
} {
  const query = useSessionQuery()
  const state = query.data
  const session = state?.authenticated ? { user: state.user, expiresAt: state.expiresAt } : null

  return {
    session,
    scope: session?.user.id ?? 'guest',
    isPending: query.isPending,
    expired: state?.authenticated === false && state.reason === 'expired',
  }
}

/**
 * Logout and user switch must leave nothing behind: the whole query cache is
 * dropped, not just invalidated, so no private page can render another user's
 * data for even one frame.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => sessionApi.logout(),
    onSettled: () => {
      // Drop every private cache entry, then write the anonymous state
      // directly. Refetching `/session` here would race the Set-Cookie that
      // clears the session and could resurrect the previous user for a frame.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      queryClient.setQueryData(queryKeys.session, { authenticated: false, reason: 'anonymous' })
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => sessionApi.login(body),
    onSuccess: async (session) => {
      // Everything cached for the visitor is dropped before the account's data
      // is read, so no guest-scoped entry can be mistaken for the new user's.
      // The session itself is *not* invalidated: the login response is already
      // authoritative, and refetching it would race the Set-Cookie write.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      queryClient.setQueryData(queryKeys.session, { authenticated: true, ...session })
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterRequest) => sessionApi.register(body),
    onSuccess: async (session) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      queryClient.setQueryData(queryKeys.session, { authenticated: true, ...session })
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
    },
  })
}
