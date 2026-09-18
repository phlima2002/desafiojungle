import { Suspense, lazy, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import type { Session } from '@/shared/api/contracts'
import { Button } from '@/components/ui/button'

const MobileNavDrawer = lazy(() => import('./mobile-nav-drawer'))

interface MobileNavProps {
  items: ReadonlyArray<{ to: string; label: string }>
  session: Session | null
}

/**
 * Gaveta de navegação sobre o `Dialog` do shadcn/ui: o Radix cuida do foco
 * preso, do Escape, do `aria-modal` e de devolver o foco ao gatilho quando
 * fecha — comportamento que uma gaveta caseira precisa reimplementar (em geral,
 * pela metade).
 *
 * O gatilho é um botão comum; o diálogo só é baixado no primeiro clique, para
 * que o peso do Radix não entre no caminho crítico de quem nunca abre o menu.
 */
export function MobileNav({ items, session }: MobileNavProps) {
  const openerRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  // O Radix devolve o foco ao elemento que o tinha antes de abrir; como o
  // diálogo chega por import dinâmico, esse elemento pode já não ser o gatilho.
  // Por isso o destino é dito explicitamente (`onCloseAutoFocus` no conteúdo).

  return (
    <>
      <Button
        ref={openerRef}
        variant="ghost"
        size="icon"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Abrir menu de navegação"
        className="text-foreground md:hidden"
        onClick={() => {
          setMounted(true)
          setOpen(true)
        }}
      >
        <Menu aria-hidden size={20} />
      </Button>

      {mounted ? (
        <Suspense fallback={null}>
          <MobileNavDrawer
            items={items}
            session={session}
            open={open}
            onOpenChange={setOpen}
            onCloseFocus={() => openerRef.current?.focus()}
          />
        </Suspense>
      ) : null}
    </>
  )
}
