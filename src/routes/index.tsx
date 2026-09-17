import { createFileRoute } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { catalogSearchSchema } from '@/features/catalog/search-params'
import { HomeHero } from '@/features/catalog/home-hero'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  return (
    <div className="space-y-16 pb-8">
      <HomeHero />
      <CatalogSection search={search} routeId="/" />
    </div>
  )
}
