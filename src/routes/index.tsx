import { Suspense, lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { catalogSearchSchema } from '@/features/catalog/search-params'
import { HomeHero } from '@/features/catalog/home-hero'
/**
 * O fim editorial da home entra depois da primeira dobra. Montá-lo junto com o
 * resto colocava o layout e a pintura de mais dez cartões dentro da janela que
 * o Lighthouse cronometra — o TBT do celular saltou de ~190 ms para ~475 ms
 * quando esta seção nasceu. Carregada à parte, ela chega quando a página já
 * está de pé, sem que ninguém perceba a diferença ao rolar.
 */
const HomeEditorial = lazy(() => import('@/features/catalog/home-editorial'))

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  // O herói vai como conteúdo da seção do catálogo porque no celular ele entra
  // depois da barra de busca — ver o comentário em `CatalogSection`.
  return (
    <div className="space-y-10 pb-8 md:space-y-16">
      <CatalogSection search={search} routeId="/" hero={<HomeHero />} />
      <Suspense fallback={null}>
        <HomeEditorial />
      </Suspense>
    </div>
  )
}
