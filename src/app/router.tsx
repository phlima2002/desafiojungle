import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { routeTree } from '@/routeTree.gen'
import { env } from '@/shared/config/env'
import { parseSearch, stringifySearch } from './search-serialization'
import { NotFound } from '@/features/shell/not-found'
import { RouteErrorBoundary } from '@/features/shell/route-error'

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    // Publicado em subcaminho, as rotas continuam sendo `/`, `/mercado`, … e o
    // roteador cuida do prefixo.
    basepath: env.basePath,
    context: { queryClient },
    defaultPreload: 'intent',
    // The query cache already handles staleness; the router should not keep a
    // second, competing copy of loader data.
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: RouteErrorBoundary,
    scrollRestoration: true,
    parseSearch,
    stringifySearch,
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}
