import { useMemo, type ReactNode } from 'react'
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
import { CatalogFilters, SORTS } from './catalog-filters'
import { MobileCatalogBar } from './mobile-catalog-bar'
import { SearchField } from './search-field'
import { PAGE_SIZE, pageWindow, toListQuery, withFilter, type CatalogSearch } from './search-params'
import { Button } from '@/components/ui/button'

const TABS = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
] as const

/**
 * Duas colunas escalonadas no celular, como o Figma desenha: a coluna da
 * direita desce meia altura de card, o que quebra a grade rígida e deixa a
 * rolagem com ritmo. A partir de `sm` o alinhamento volta a ser reto.
 */
const GRID =
  'grid grid-cols-2 gap-4 max-sm:[&>li:nth-child(even)]:mt-10 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3'

interface CatalogSectionProps {
  search: CatalogSearch
  routeId: '/' | '/mercado'
  /** O herói da home, que no celular aparece depois da busca. */
  hero?: ReactNode
}

export function CatalogSection({ search, routeId, hero }: CatalogSectionProps) {
  const navigate = useNavigate()
  const { session } = useSession()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const quickAdd = useNftDetail()

  const query = useMemo(() => toListQuery(search), [search])
  const catalog = useCatalogQuery(query)

  const items: NftSummary[] = catalog.data?.items ?? []
  useNftSubscription(items.map((item) => item.id))

  /**
   * `replace` existe por causa da busca: digitar empurra um valor novo a cada
   * pausa de 300 ms, e cada um deles viraria uma entrada no histórico — o botão
   * de voltar andaria letra a letra. Os outros filtros continuam empilhando
   * normalmente, que é o que se espera de um clique.
   */
  const update = (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => {
    void navigate({
      to: routeId,
      search: withFilter(search, patch) as never,
      replace: options?.replace,
    })
  }

  const pagination = catalog.data?.pagination
  const facets = catalog.data?.facets

  return (
    <>
      {/* No celular o Figma abre a tela pela busca, com os filtros ao lado dela
          e o herói logo abaixo. Por isso o herói entra aqui como conteúdo desta
          seção em vez de ficar na rota: é o que permite a barra vir antes dele
          no mobile e sumir no desktop, onde as facetas voltam para a lateral. */}
      <MobileCatalogBar search={search} facets={facets} update={update} />
      {hero}

      <section aria-labelledby="catalogo-titulo" className="mx-auto max-w-page px-4 sm:px-8">
        <h2 id="catalogo-titulo" className="sr-only">
          Catálogo de NFTs
        </h2>

        <div className="grid gap-8 lg:grid-cols-[236px_minmax(0,1fr)]">
          {/* Abaixo de `lg` as facetas moram na gaveta que o botão de filtros
            abre (ver `MobileCatalogBar`), como o Figma desenha no celular. */}
          <CatalogFilters search={search} facets={facets} update={update} className="hidden lg:block" />

          <div className="min-w-0 space-y-6">
            <SearchField
              value={search.q}
              onChange={(q) => update({ q }, { replace: true })}
              className="hidden lg:block"
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Recortes são filtros que vivem na URL, não painéis de conteúdo:
                uma `Tabs` do Radix apontaria `aria-controls` para painéis que
                não existem (o Lighthouse reprova), então aqui a lista de abas é
                escrita à mão — o `Tabs` do shadcn/ui é usado no detalhe do NFT,
                onde os painéis existem de verdade. */}
              {/* No celular as três abas não cabem lado a lado sem encolher a
                  fonte a ponto de ficarem ilegíveis, e quebrá-las em duas linhas
                  empurra o catálogo para baixo. Então elas rolam na horizontal,
                  numa faixa só, como o Figma mostra. */}
              <div
                role="tablist"
                aria-label="Recortes do catálogo"
                className="-mx-4 flex max-w-full gap-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
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

              {/* Aqui o controle é nativo de propósito: é o único `select` das
                duas páginas auditadas, e um do sistema dispensa ~12 kB de
                JavaScript no caminho crítico — além de abrir o seletor nativo no
                celular. O `Select` do shadcn/ui é usado nos formulários, onde
                não pesa na medição e o menu estilizado faz diferença. */}
              <label className="hidden min-w-0 items-center gap-2 text-sm text-sand lg:flex">
                <span className="shrink-0">Ordenar por:</span>
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
                <ul className={GRID}>
                  {Array.from({ length: PAGE_SIZE }, (_, index) => (
                    <li key={index}>
                      <NftCardSkeleton />
                    </li>
                  ))}
                </ul>
              ) : catalog.isError ? (
                <div
                  role="alert"
                  className="rounded-2xl bg-card p-8 text-center md:rounded-md md:border md:border-line"
                >
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
                <div className="rounded-2xl bg-card p-10 text-center md:rounded-md md:border md:border-line">
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
                <ul className={cn(GRID, 'transition-opacity', catalog.isFetching && 'opacity-60')}>
                  {items.map((nft, position) => (
                    <li key={nft.id}>
                      <NftCard
                        nft={nft}
                        priority={position === 0}
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
                {pageWindow(pagination.page, pagination.totalPages).map((page, position, list) =>
                  page === null ? (
                    <span
                      key={`gap-depois-de-${list[position - 1] ?? 'inicio'}`}
                      aria-hidden
                      className="grid size-9 place-items-center text-xs text-clay"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      size="icon"
                      variant={page === pagination.page ? 'default' : 'secondary'}
                      aria-current={page === pagination.page ? 'page' : undefined}
                      aria-label={`Página ${page} de ${pagination.totalPages}`}
                      onClick={() => update({ pagina: page === 1 ? undefined : page })}
                      className={cn(
                        'text-xs',
                        page !== pagination.page &&
                          'bg-transparent text-sand hover:border-primary hover:text-accent',
                      )}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </nav>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
