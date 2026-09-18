import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { NftSummary } from '@/shared/api/contracts'
import { cn } from '@/shared/lib/utils'
import { useSession } from '@/features/session/use-session'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { useAddToCart } from '@/features/cart/use-cart'
import { useNftDetail } from './use-quick-add'
import { useNftSubscription } from '@/features/realtime/realtime-provider'
import { useCatalogQuery } from './use-catalog'
import { NftCard, NftCardSkeleton } from './nft-card'
import { PriceRangeFilter } from './price-range-filter'
import { PAGE_SIZE, toListQuery, toggleInList, withFilter, type CatalogSearch } from './search-params'
import { Button } from '@/components/ui/button'

const TABS = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
] as const

const SORTS = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'trending', label: 'Em alta' },
  { value: 'name-asc', label: 'Nome (A–Z)' },
] as const

interface CatalogSectionProps {
  search: CatalogSearch
  routeId: '/' | '/mercado'
}

export function CatalogSection({ search, routeId }: CatalogSectionProps) {
  const navigate = useNavigate()
  const { session } = useSession()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const quickAdd = useNftDetail()

  const query = useMemo(() => toListQuery(search), [search])
  const catalog = useCatalogQuery(query)

  const items: NftSummary[] = catalog.data?.items ?? []
  useNftSubscription(items.map((item) => item.id))

  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({ to: routeId, search: withFilter(search, patch) as never })
  }

  const pagination = catalog.data?.pagination
  const facets = catalog.data?.facets

  return (
    <section aria-labelledby="catalogo-titulo" className="mx-auto max-w-page px-4 sm:px-8">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="grid gap-8 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside aria-label="Filtros" className="min-w-0 space-y-6">
          <fieldset className="rounded-md bg-card p-5">
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
                      onClick={() =>
                        update({ categoria: toggleInList(search.categoria, facet.value as never) })
                      }
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
            <div className="skeleton h-40 w-full rounded-md" aria-hidden />
          )}

          <fieldset className="rounded-md bg-card p-5">
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
                      onClick={() => update({ rede: toggleInList(search.rede, facet.value as never) })}
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
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Recortes são filtros que vivem na URL, não painéis de conteúdo:
                uma `Tabs` do Radix apontaria `aria-controls` para painéis que
                não existem (o Lighthouse reprova), então aqui a lista de abas é
                escrita à mão — o `Tabs` do shadcn/ui é usado no detalhe do NFT,
                onde os painéis existem de verdade. */}
            <div role="tablist" aria-label="Recortes do catálogo" className="flex flex-wrap gap-6">
              {TABS.map((tab) => {
                const active = (search.tab ?? 'all') === tab.value
                return (
                  <Button
                    key={tab.value}
                    type="button"
                    role="tab"
                    variant="ghost"
                    size="sm"
                    aria-selected={active}
                    onClick={() => update({ tab: tab.value })}
                    className={cn(
                      'h-auto rounded-none border-b-2 px-0 pb-1 text-sm',
                      active
                        ? 'border-primary font-medium text-accent'
                        : 'border-transparent font-normal text-sand hover:text-accent',
                    )}
                  >
                    {tab.label}
                  </Button>
                )
              })}
            </div>

            {/* Aqui o controle é nativo de propósito: é o único campo das duas
                páginas auditadas, e um `<select>` do sistema dispensa ~12 kB de
                JavaScript no caminho crítico — além de abrir o seletor nativo no
                celular. O `Select` do shadcn/ui é usado nos formulários, onde
                não pesa na medição e o menu estilizado faz diferença. */}
            <label className="flex min-w-0 items-center gap-2 text-sm text-sand">
              <span>Ordenar por:</span>
              <select
                value={search.ordenar ?? 'recent'}
                onChange={(event) => update({ ordenar: event.target.value as never })}
                className="h-9 max-w-[14rem] min-w-0 rounded-sm border border-line bg-card px-2 text-sm text-foreground"
              >
                {SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div aria-live="polite" aria-busy={catalog.isFetching}>
            {catalog.isPending ? (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <li key={index}>
                    <NftCardSkeleton />
                  </li>
                ))}
              </ul>
            ) : catalog.isError ? (
              <div role="alert" className="rounded-md border border-line bg-card p-8 text-center">
                <p className="text-base font-bold">Não foi possível carregar o catálogo.</p>
                <p className="mt-2 text-xs text-muted">{catalog.error.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void catalog.refetch()}
                  className="mt-4"
                >
                  Tentar de novo
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-md border border-line bg-card p-10 text-center">
                <p className="text-base font-bold">Nenhum NFT encontrado</p>
                <p className="mt-2 text-xs text-muted">
                  Ajuste a busca ou remova alguns filtros para ver mais resultados.
                </p>
                <Link
                  to={routeId}
                  search={{} as never}
                  className="mt-4 inline-block rounded-sm border border-primary px-4 py-2 text-xs font-bold text-accent hover:bg-primary hover:text-primary-foreground"
                >
                  Limpar filtros
                </Link>
              </div>
            ) : (
              <ul
                className={cn(
                  'grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3',
                  catalog.isFetching && 'opacity-60',
                )}
              >
                {items.map((nft) => (
                  <li key={nft.id}>
                    <NftCard
                      nft={nft}
                      canFavorite={Boolean(session)}
                      onToggleFavorite={(target) =>
                        toggleFavorite.mutate({ nftId: target.id, favorited: !target.favorited })
                      }
                      onQuickAdd={(target) =>
                        void quickAdd(target.slug).then((detail) => {
                          const edition = detail.editions.find((candidate) => candidate.available > 0)
                          if (edition) {
                            addToCart.mutate({ nftId: detail.id, editionId: edition.id, quantity: 1 })
                          }
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <nav aria-label="Paginação" className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                <Button
                  key={page}
                  type="button"
                  size="icon"
                  variant={page === pagination.page ? 'default' : 'secondary'}
                  aria-current={page === pagination.page ? 'page' : undefined}
                  onClick={() => update({ pagina: page === 1 ? undefined : page })}
                  className={cn(
                    'text-xs',
                    page !== pagination.page &&
                      'bg-transparent text-sand hover:border-primary hover:text-accent',
                  )}
                >
                  {page}
                </Button>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  )
}
