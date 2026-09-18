import { createFileRoute } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { catalogSearchSchema } from '@/features/catalog/search-params'
import { HomeHero } from '@/features/catalog/home-hero'
import { HomeEditorial } from '@/features/catalog/home-editorial'

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
      <HomeEditorial />
    </div>
  )
}
