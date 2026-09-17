import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage } from '@/features/auth/login-page'
import { queryKeys, cachePolicy } from '@/shared/api/query-keys'
import { sessionApi } from '@/shared/api/endpoints'

export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  // Already signed in? Go straight back to where the collector was heading.
  beforeLoad: async ({ context, search }) => {
    const state = await context.queryClient
      .ensureQueryData({
        queryKey: queryKeys.session,
        queryFn: ({ signal }) => sessionApi.current(signal),
        ...cachePolicy.session,
      })
      .catch(() => null)

    if (state?.authenticated) {
      throw redirect({ to: search.redirect ?? '/', search: {} as never })
    }
  },
  component: LoginPage,
})
