import { createFileRoute } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { catalogSearchSchema } from '@/features/catalog/search-params'

export const Route = createFileRoute('/mercado')({
  validateSearch: catalogSearchSchema,
  component: MarketPage,
})

function MarketPage() {
  const search = Route.useSearch()
  return (
    <div className="space-y-8 pb-10 md:py-10">
      <CatalogSection
        search={search}
        routeId="/mercado"
        hero={
          <header className="mx-auto max-w-page px-4 pt-6 sm:px-8 md:pt-0">
            <h1 className="text-h1 font-bold">Mercado</h1>
            <p className="mt-2 text-xs text-muted">
              Busque, filtre e ordene todo o catálogo. Os parâmetros ficam na URL e sobrevivem a refresh.
            </p>
          </header>
        }
      />
    </div>
  )
}
