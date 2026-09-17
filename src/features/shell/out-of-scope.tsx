import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

/**
 * Editorial, support and activity pages are explicitly outside the challenge
 * scope. They resolve to a real route with an honest message instead of a dead
 * link or a fake success state.
 */
export function OutOfScope({ title }: { title: string }) {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-h2 font-bold">{title}</h1>
      <p className="text-sm text-muted">
        Esta área editorial não faz parte do escopo do desafio. A navegação continua funcionando para que
        nenhum link fique quebrado, mas não há conteúdo simulado aqui.
      </p>
      <Link to="/mercado" search={{}} className="text-sm font-bold text-accent underline underline-offset-4">
        Ir para o mercado
      </Link>
    </section>
  )
}

/**
 * A menu entry the layout shows but the challenge excludes. It stays visible
 * and keyboard-reachable, and says plainly that it leads nowhere, instead of
 * pretending to work.
 */
export function OutOfScopeNotice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      title={`${label} não faz parte do escopo do desafio`}
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-3 rounded-sm px-2 py-2.5 text-sm text-clay"
    >
      {children}
    </span>
  )
}
