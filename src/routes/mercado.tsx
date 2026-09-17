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
    <div className="space-y-8 py-10">
      <header className="mx-auto max-w-page px-4 sm:px-8">
        <h1 className="text-h1 font-bold">Mercado</h1>
        <p className="mt-2 text-xs text-muted">
          Busque, filtre e ordene todo o catálogo. Os parâmetros ficam na URL e sobrevivem a refresh.
        </p>
      </header>
      <CatalogSection search={search} routeId="/mercado" />
    </div>
  )
}
