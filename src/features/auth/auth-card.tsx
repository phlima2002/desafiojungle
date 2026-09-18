import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/components/ui/button'

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
    <section className="mx-auto w-full max-w-md px-4 py-10 md:py-14">
      {/* No celular esta é a tela inteira, e o Figma a abre pela marca: sem
          cabeçalho global, o KURIO aqui é o que diz onde se está. A partir de
          `md` o cabeçalho do site cumpre esse papel e o cartão volta. */}
      <p aria-hidden className="mb-10 text-center text-wordmark font-bold md:hidden">
        KURIO
      </p>
      <div className="px-0 py-0 md:rounded-md md:border md:border-line md:bg-card md:px-8 md:py-8 md:shadow-pop">
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
              <Button
                type="button"
                variant="secondary"
                disabled
                title="Login social não faz parte do escopo do desafio"
                className="h-auto w-full bg-transparent py-2.5 text-2xs font-normal text-sand"
              >
                <span aria-hidden className={cn('text-base font-bold', provider.color)}>
                  {provider.mark}
                </span>
                {provider.label}
              </Button>
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
