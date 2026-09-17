import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import type { Session } from '@/shared/api/contracts'

interface MobileNavProps {
  items: ReadonlyArray<{ to: string; label: string }>
  session: Session | null
}

/**
 * Uses the native modal dialog: focus is trapped, Escape closes, and the rest
 * of the page is inert — behaviour that a hand-rolled drawer has to reimplement
 * (usually incompletely).
 */
export function MobileNav({ items, session }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Abrir menu de navegação"
        className="rounded-sm p-2 text-foreground transition-colors hover:text-accent md:hidden"
      >
        <Menu aria-hidden size={20} />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu de navegação"
        onClose={() => {
          setOpen(false)
          openerRef.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false)
        }}
        className="m-0 ml-auto h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-card p-0 text-foreground backdrop:bg-ink-950/70"
      >
        <div className="flex h-full flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-[0.1em]">KURIO</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="rounded-sm p-2 text-sand transition-colors hover:text-accent"
            >
              <X aria-hidden size={20} />
            </button>
          </div>

          <nav aria-label="Navegação principal (mobile)">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-2 py-3 text-sm text-accent"
                >
                  Meu perfil
                </Link>
                <Link
                  to="/conta/carteiras"
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-2 py-3 text-sm text-accent"
                >
                  Carteiras
                </Link>
              </>
            ) : (
              <Link
                to="/entrar"
                search={{}}
                onClick={() => setOpen(false)}
                className="block rounded-sm bg-primary px-4 py-3 text-center text-xs font-bold text-primary-foreground"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
