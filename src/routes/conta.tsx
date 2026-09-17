import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Download, Heart, LifeBuoy, LogOut, Tag, User, Wallet, Zap } from 'lucide-react'
import { requireSession } from '@/app/guards'
import { useLogout } from '@/features/session/use-session'
import { OutOfScopeNotice } from '@/features/shell/out-of-scope'

export const Route = createFileRoute('/conta')({
  beforeLoad: ({ context, location }) => requireSession(context.queryClient, location.href),
  component: AccountLayout,
})

const ITEMS = [
  { to: '/conta/perfil', label: 'Dados do perfil', Icon: User },
  { to: '/conta/carteiras', label: 'Carteiras', Icon: Wallet },
] as const

/** Sections the layout shows but the challenge puts out of scope. */
const OUT_OF_SCOPE = [
  { label: 'Atividade', Icon: Zap },
  { label: 'Lista de interesse', Icon: Heart },
  { label: 'Ofertas', Icon: Tag },
  { label: 'Arquivos baixados', Icon: Download },
  { label: 'Suporte', Icon: LifeBuoy },
] as const

function AccountLayout() {
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <div className="mx-auto grid max-w-page gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Menu da conta" className="h-fit rounded-md border border-line bg-card p-4">
        <h2 className="px-2 pb-3 text-lg font-bold">Meu perfil</h2>
        <ul className="space-y-0.5 text-sm">
          {ITEMS.map(({ to, label, Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-sm border-l-2 border-transparent px-2 py-2.5 text-sand transition-colors hover:text-accent [&.active]:border-primary [&.active]:font-bold [&.active]:text-accent"
              >
                <Icon aria-hidden size={16} />
                {label}
              </Link>
            </li>
          ))}

          {OUT_OF_SCOPE.map(({ label, Icon }) => (
            <li key={label}>
              <OutOfScopeNotice label={label}>
                <Icon aria-hidden size={16} />
                {label}
              </OutOfScopeNotice>
            </li>
          ))}

          <li className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={() =>
                logout.mutate(undefined, {
                  // Leaving a protected page is part of logging out: the guard
                  // only runs on navigation, so we move the collector out.
                  onSettled: () => void navigate({ to: '/', search: {} }),
                })
              }
              className="flex w-full items-center gap-3 rounded-sm px-2 py-2.5 text-sm font-bold text-accent"
            >
              <LogOut aria-hidden size={16} />
              Sair
            </button>
          </li>
        </ul>
      </nav>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
