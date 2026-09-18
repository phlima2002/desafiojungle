import { useEffect } from 'react'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { SiteHeader } from '@/features/shell/site-header'
import { SiteFooter } from '@/features/shell/site-footer'
import { NotFound } from '@/features/shell/not-found'
import { RouteErrorBoundary } from '@/features/shell/route-error'
import { finishShellHandoff } from '@/app/shell-handoff'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteErrorBoundary,
})

function RootLayout() {
  // First commit: the application can draw, so the shell steps aside.
  useEffect(finishShellHandoff, [])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
