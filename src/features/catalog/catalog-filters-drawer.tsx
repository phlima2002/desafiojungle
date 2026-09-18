import { Link } from '@tanstack/react-router'
import type { NftListResponse } from '@/shared/api/contracts'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CatalogFilters } from './catalog-filters'
import type { CatalogSearch } from './search-params'

/**
 * As facetas do catálogo numa gaveta que sobe pelo pé da tela — o padrão de
 * filtros no celular. Vive em um módulo próprio para ser importada sob demanda
 * (ver `MobileCatalogBar`).
 */
export default function CatalogFiltersDrawer({
  search,
  facets,
  update,
  open,
  onOpenChange,
  onCloseFocus,
}: {
  search: CatalogSearch
  facets: NftListResponse['facets'] | undefined
  update: (patch: Partial<CatalogSearch>) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseFocus: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="bottom"
        aria-describedby={undefined}
        className="gap-5"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseFocus()
        }}
      >
        <DialogTitle className="text-h4 font-bold">Filtros</DialogTitle>

        <CatalogFilters search={search} facets={facets} update={update} withSort />

        <div className="flex gap-3 pb-2">
          <Button asChild variant="outline" size="sm" className="flex-1 rounded-pill">
            <Link to="." search={{} as never} onClick={() => onOpenChange(false)}>
              Limpar
            </Link>
          </Button>
          <Button type="button" size="sm" className="flex-1 rounded-pill" onClick={() => onOpenChange(false)}>
            Ver resultados
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
