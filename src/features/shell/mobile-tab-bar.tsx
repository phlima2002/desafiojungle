import { Suspense, lazy, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Compass, Heart, Home, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useCartQuery } from '@/features/cart/use-cart'
import { useSession } from '@/features/session/use-session'

const MobileNavDrawer = lazy(() => import('./mobile-nav-drawer'))

const NAV = [
  { to: '/', label: 'Início' },
  { to: '/mercado', label: 'Mercado' },
  { to: '/criadores', label: 'Criadores' },
  { to: '/aprenda', label: 'Aprenda' },
] as const

const item =
  'flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-sand transition-colors hover:text-accent [&.active]:text-accent'

/**
 * Barra de navegação do mobile, como o Figma desenha: cinco ações fixas no pé
 * da tela, com a do meio em destaque.
 *
 * Duas decisões que valem explicar:
 *
 * 1. O cabeçalho do site some abaixo de `md` (ver `RootLayout`), então esta
 *    barra é a única navegação global no celular. Por isso o quinto item abre a
 *    mesma gaveta de sempre, que carrega Criadores, Aprenda, conta e sessão —
 *    sem ela, essas rotas ficariam inalcançáveis no telefone.
 * 2. "Lista de interesse" está fora do escopo do desafio. O ícone continua no
 *    lugar que o layout lhe dá, mas diz o que é, em vez de fingir uma tela.
 */
export function MobileTabBar() {
  const { session } = useSession()
  const cart = useCartQuery()
  const itemCount = cart.data?.totals.itemCount ?? 0

  const openerRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* O espaçador ocupa a altura da barra no fluxo, para que o fim de
          qualquer página fique alcançável acima dela. */}
      <div aria-hidden className="h-24 md:hidden" />

      <nav aria-label="Navegação do aplicativo" className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:hidden">
        <ul className="flex items-center gap-1 rounded-3xl border border-line bg-card/95 px-2 backdrop-blur">
          <li className="flex-1">
            <Link to="/" activeOptions={{ exact: true }} className={item}>
              <Home aria-hidden size={20} />
              <span className="text-eyebrow">Início</span>
            </Link>
          </li>

          <li className="flex-1">
            <span
              aria-disabled="true"
              title="Lista de interesse não faz parte do escopo do desafio"
              className="flex h-14 cursor-not-allowed flex-col items-center justify-center gap-1 text-clay"
            >
              <Heart aria-hidden size={20} />
              <span className="text-eyebrow">Interesse</span>
            </span>
          </li>

          {/* A ação do meio é a que o layout destaca: explorar o catálogo. */}
          <li className="flex-1">
            <Link
              to="/mercado"
              search={{}}
              aria-label="Explorar o catálogo"
              className="mx-auto -mt-6 grid size-14 place-items-center rounded-pill bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
            >
              <Compass aria-hidden size={24} />
            </Link>
          </li>

          <li className="flex-1">
            <Link
              to="/carrinho"
              className={cn(item, 'relative')}
              aria-label={itemCount > 0 ? `Carrinho com ${itemCount} itens` : 'Carrinho vazio'}
            >
              <ShoppingCart aria-hidden size={20} />
              <span aria-hidden className="text-eyebrow">
                Carrinho
              </span>
              {itemCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute top-2 right-1/2 grid h-4 min-w-4 translate-x-4 place-items-center rounded-pill bg-primary px-1 text-micro font-medium text-primary-foreground"
                >
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </li>

          <li className="flex-1">
            <button
              ref={openerRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label="Abrir menu e conta"
              onClick={() => {
                setMounted(true)
                setOpen(true)
              }}
              className={item}
            >
              <User aria-hidden size={20} />
              <span className="text-eyebrow">{session ? 'Conta' : 'Entrar'}</span>
            </button>
          </li>
        </ul>
      </nav>

      {mounted ? (
        <Suspense fallback={null}>
          <MobileNavDrawer
            items={NAV}
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
