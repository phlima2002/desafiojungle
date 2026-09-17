import { useEffect, useMemo, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { onSessionExpired } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'

export function AppProviders({ children }: { children?: ReactNode }) {
  const queryClient = useMemo(() => createQueryClient(), [])
  const router = useMemo(() => createAppRouter(queryClient), [queryClient])

  useEffect(
    () =>
      onSessionExpired(() => {
        // Keep the collector where they are and surface the expiry through the
        // session query; the guards then move them to /entrar with a return URL.
        queryClient.setQueryData(queryKeys.session, undefined)
        void queryClient.invalidateQueries({ queryKey: queryKeys.session })
      }),
    [queryClient],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} />
        {children}
      </RealtimeProvider>
    </QueryClientProvider>
  )
}
