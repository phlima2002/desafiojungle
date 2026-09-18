import { Suspense, lazy, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { NftListResponse } from '@/shared/api/contracts'
import { SearchField } from './search-field'
import type { CatalogSearch } from './search-params'

const CatalogFiltersDrawer = lazy(() => import('./catalog-filters-drawer'))

/**
 * Topo do catálogo no celular, como o Figma desenha: a busca ocupando a linha e
 * o botão de filtros ao lado. No desktop nada disto aparece — lá a busca fica
 * na coluna de resultados e as facetas na barra lateral.
 *
 * A gaveta com as facetas só é baixada no primeiro toque, pelo mesmo motivo do
 * menu: o Radix não precisa entrar no caminho crítico de quem nunca a abre.
 */
export function MobileCatalogBar({
  search,
  facets,
  update,
}: {
  search: CatalogSearch
  facets: NftListResponse['facets'] | undefined
  update: (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void
}) {
  const openerRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  const active =
    (search.categoria?.length ?? 0) + (search.rede?.length ?? 0) + (search.min ? 1 : 0) + (search.max ? 1 : 0)

  return (
    <div className="mx-auto flex max-w-page items-center gap-3 px-4 pt-4 sm:px-8 lg:hidden">
      <SearchField
        value={search.q}
        onChange={(q) => update({ q }, { replace: true })}
        className="min-w-0 flex-1"
        inputClassName="h-12 rounded-2xl bg-card"
      />

      <button
        ref={openerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={active > 0 ? `Filtros (${active} ativos)` : 'Filtros'}
        onClick={() => {
          setMounted(true)
          setOpen(true)
        }}
        className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <SlidersHorizontal aria-hidden size={20} />
        {active > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-pill bg-card px-1 text-micro font-medium text-accent"
          >
            {active}
          </span>
        ) : null}
      </button>

      {mounted ? (
        <Suspense fallback={null}>
          <CatalogFiltersDrawer
            search={search}
            facets={facets}
            update={update}
            open={open}
            onOpenChange={setOpen}
            onCloseFocus={() => openerRef.current?.focus()}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
