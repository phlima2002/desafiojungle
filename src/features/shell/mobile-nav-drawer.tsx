import { Link } from '@tanstack/react-router'
import type { Session } from '@/shared/api/contracts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

/**
 * Conteúdo da gaveta, em um módulo próprio: o `Dialog` do Radix traz consigo
 * trava de rolagem, camada dispensável e portal — peso que não faz sentido
 * baixar em toda visita para um menu que talvez nunca abra. `MobileNav` importa
 * este arquivo sob demanda, no primeiro clique.
 */
export default function MobileNavDrawer({
  items,
  session,
  open,
  onOpenChange,
  onCloseFocus,
}: {
  items: ReadonlyArray<{ to: string; label: string }>
  session: Session | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Para onde o foco volta ao fechar — ver `MobileNav`. */
  onCloseFocus: () => void
}) {
  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        aria-describedby={undefined}
        className="gap-6"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseFocus()
        }}
      >
        {/* O nome acessível do diálogo é o título; a marca fica ao lado dele,
            visível, sem virar o rótulo que o leitor de tela anuncia. */}
        <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
        <span aria-hidden className="text-xs font-bold tracking-[0.1em]">
          KURIO
        </span>

        <nav aria-label="Navegação principal (mobile)">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={close}
                  className="block rounded-sm px-2 py-3 text-base text-foreground transition-colors hover:text-accent [&.active]:font-bold [&.active]:text-accent"
                  activeOptions={{ exact: item.to === '/' }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto space-y-3 border-t border-line pt-6">
          {session ? (
            <>
              <Link
                to="/conta/perfil"
                onClick={close}
                className="block rounded-sm px-2 py-3 text-sm text-accent"
              >
                Meu perfil
              </Link>
              <Link
                to="/conta/carteiras"
                onClick={close}
                className="block rounded-sm px-2 py-3 text-sm text-accent"
              >
                Carteiras
              </Link>
            </>
          ) : (
            <Button asChild size="sm" className="w-full">
              <Link to="/entrar" search={{}} onClick={close}>
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
