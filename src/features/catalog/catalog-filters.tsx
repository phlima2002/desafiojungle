import type { NftListResponse } from '@/shared/api/contracts'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/components/ui/button'
import { PriceRangeFilter } from './price-range-filter'
import { selectOne, type CatalogSearch } from './search-params'

type Facets = NftListResponse['facets']

/**
 * As facetas do catálogo, num componente próprio porque aparecem em dois
 * lugares: a barra lateral do desktop e a gaveta do celular, onde o Figma as
 * coloca atrás do botão de filtros ao lado da busca. O conteúdo é o mesmo; só o
 * recipiente muda.
 */
export const SORTS = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'trending', label: 'Em alta' },
  { value: 'name-asc', label: 'Nome (A–Z)' },
] as const

export function CatalogFilters({
  search,
  facets,
  update,
  className,
  withSort = false,
}: {
  search: CatalogSearch
  facets: Facets | undefined
  update: (patch: Partial<CatalogSearch>) => void
  className?: string
  /** A gaveta do celular também carrega a ordenação, que lá não cabe na barra. */
  withSort?: boolean
}) {
  return (
    /* No layout a barra lateral é um bloco só: um cartão com as três seções
       dentro, separadas por espaço, não três cartões soltos. */
    <div className={cn('min-w-0 rounded-2xl bg-card p-5 md:rounded-md', className)}>
      {withSort ? (
        <label className="flex flex-col gap-2 text-sm text-sand">
          Ordenar por:
          <select
            value={search.ordenar ?? 'recent'}
            onChange={(event) => update({ ordenar: event.target.value as never })}
            className="h-11 rounded-2xl border border-line bg-card px-3 text-sm text-foreground"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <fieldset>
        <legend className="mb-3 text-lg font-bold">Coleções</legend>
        <ul className="space-y-2">
          {/* Placeholder rows keep the sidebar's height stable while the
              facets load, so the page never shifts under the pointer. */}
          {facets
            ? null
            : Array.from({ length: 9 }, (_, index) => (
                <li key={index} className="py-1">
                  <span className="skeleton block h-5 w-full" aria-hidden />
                </li>
              ))}
          {(facets?.categories ?? []).map((facet) => {
            const active = search.categoria?.includes(facet.value as never) ?? false
            return (
              <li key={facet.value}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  onClick={() => update({ categoria: selectOne(search.categoria, facet.value as never) })}
                  className={cn(
                    'h-auto w-full justify-between px-0 py-1 text-sm',
                    active ? 'font-bold text-accent' : 'font-normal text-sand hover:text-accent',
                  )}
                >
                  <span>{facet.label}</span>
                  <span className="font-bold">({facet.count})</span>
                </Button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {facets ? (
        <PriceRangeFilter
          key={`${search.min ?? ''}:${search.max ?? ''}:${facets.priceRange.min}:${facets.priceRange.max}`}
          bounds={facets.priceRange}
          value={{ min: search.min, max: search.max }}
          onApply={(next) => update(next)}
        />
      ) : (
        <div className="skeleton mt-8 h-40 w-full rounded-sm" aria-hidden />
      )}

      <fieldset className="mt-8">
        <legend className="mb-3 text-lg font-bold">Rede</legend>
        <ul className="space-y-2">
          {facets
            ? null
            : Array.from({ length: 3 }, (_, index) => (
                <li key={index} className="py-1">
                  <span className="skeleton block h-5 w-full" aria-hidden />
                </li>
              ))}
          {(facets?.networks ?? []).map((facet) => {
            const active = search.rede?.includes(facet.value as never) ?? false
            return (
              <li key={facet.value}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  onClick={() => update({ rede: selectOne(search.rede, facet.value as never) })}
                  className={cn(
                    'h-auto w-full justify-between px-0 py-1 text-sm',
                    active ? 'font-bold text-accent' : 'font-normal text-sand hover:text-accent',
                  )}
                >
                  <span>{facet.label}</span>
                  <span className="font-bold">({facet.count})</span>
                </Button>
              </li>
            )
          })}
        </ul>
      </fieldset>
    </div>
  )
}
