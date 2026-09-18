import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'

/**
 * Login and sign-up share one card. In the layout it sits in a modal over the
 * catalogue; here each one is a real route so that direct access, refresh and
 * the post-login return URL all work — the visual treatment is the same.
 */
const tabClass = (isActive: boolean) =>
  cn('text-h3 font-bold transition-colors', isActive ? 'text-accent' : 'text-cream hover:text-accent')

export function AuthCard({
  active,
  redirect,
  description,
  children,
}: {
  active: 'entrar' | 'criar-conta'
  redirect?: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-14">
      <div className="rounded-md border border-line bg-card px-6 py-8 shadow-pop sm:px-8">
        <h1 className="flex items-center justify-center gap-3">
          <Link
            to="/entrar"
            search={redirect ? { redirect } : {}}
            className={tabClass(active === 'entrar')}
            aria-current={active === 'entrar' ? 'page' : undefined}
          >
            Entrar
          </Link>
          <Link
            to="/criar-conta"
            search={redirect ? { redirect } : {}}
            className={tabClass(active === 'criar-conta')}
            aria-current={active === 'criar-conta' ? 'page' : undefined}
          >
            Criar conta
          </Link>
        </h1>

        <p className="mt-3 text-center text-2xs text-muted">{description}</p>

        <div className="mt-6">{children}</div>

        <p className="mt-8 text-center text-2xs text-muted">Ou continue com</p>

        <ul className="mt-3 space-y-2">
          {[
            { label: 'Continuar com Google', mark: 'G', color: 'text-brand-google' },
            { label: 'Continuar com Facebook', mark: 'f', color: 'text-brand-facebook' },
          ].map((provider) => (
            <li key={provider.label}>
              <button
                type="button"
                disabled
                title="Login social não faz parte do escopo do desafio"
                className="flex w-full items-center justify-center gap-3 rounded-sm border border-line px-4 py-2.5 text-2xs text-sand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span aria-hidden className={cn('text-base font-bold', provider.color)}>
                  {provider.mark}
                </span>
                {provider.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-3xs text-clay">
          O login social está fora do escopo e por isso permanece desabilitado.
        </p>
      </div>
    </section>
  )
}
