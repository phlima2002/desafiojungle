import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { requireSession } from '@/app/guards'
import { useLogout } from '@/features/session/use-session'

export const Route = createFileRoute('/conta')({
  beforeLoad: ({ context, location }) => requireSession(context.queryClient, location.href),
  component: AccountLayout,
})

function AccountLayout() {
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <div className="mx-auto grid max-w-page gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Menu da conta" className="h-fit rounded-md bg-card p-5">
        <ul className="space-y-1 text-sm">
          <li>
            <Link to="/conta/perfil" className="block py-2 text-accent [&.active]:font-bold">
              Dados do perfil
            </Link>
          </li>
          <li>
            <Link to="/conta/carteiras" className="block py-2 text-accent [&.active]:font-bold">
              Carteiras
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() =>
                logout.mutate(undefined, {
                  // Leaving a protected page is part of logging out: the guard
                  // only runs on navigation, so we move the collector out.
                  onSettled: () => void navigate({ to: '/', search: {} }),
                })
              }
              className="py-2 text-sm font-bold text-accent"
            >
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
