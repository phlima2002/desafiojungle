import { Link } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { useCartQuery } from '@/features/cart/use-cart'
import { useSession } from '@/features/session/use-session'

const NAV = [
  { to: '/', label: 'Início' },
  { to: '/mercado', label: 'Mercado' },
  { to: '/criadores', label: 'Criadores' },
  { to: '/aprenda', label: 'Aprenda' },
] as const

export function SiteHeader() {
  const { session } = useSession()
  const cart = useCartQuery()
  const itemCount = cart.data?.totals.itemCount ?? 0

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-18 max-w-page items-center justify-between gap-6 px-4 sm:px-8">
        <Link to="/" className="text-xs font-bold tracking-[0.1em]" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Navegação principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-base text-foreground/90 transition-colors hover:text-accent [&.active]:font-bold [&.active]:text-accent"
                  activeOptions={{ exact: item.to === '/' }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/mercado"
            className="rounded-sm p-2 text-foreground transition-colors hover:text-accent"
            aria-label="Buscar NFTs"
          >
            <Search aria-hidden size={18} />
          </Link>

          <Link
            to="/carrinho"
            className="relative rounded-sm p-2 text-foreground transition-colors hover:text-accent"
            aria-label={itemCount > 0 ? `Carrinho com ${itemCount} itens` : 'Carrinho vazio'}
          >
            <ShoppingCart aria-hidden size={18} />
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-pill bg-primary px-1 text-micro font-medium text-primary-foreground"
            >
              {itemCount}
            </span>
          </Link>

          {session ? (
            <Link
              to="/conta/perfil"
              className="flex items-center gap-2 rounded-sm border border-primary px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {session.user.displayName}
            </Link>
          ) : (
            <Link
              to="/entrar"
              className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <LogIn aria-hidden size={16} />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
