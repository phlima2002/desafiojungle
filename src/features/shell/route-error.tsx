import type { ErrorComponentProps } from '@tanstack/react-router'
import { isApiError } from '@/shared/api/errors'

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message = isApiError(error) ? error.message : 'Algo deu errado ao carregar esta página.'

  return (
    <section
      role="alert"
      className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-h2 font-bold">Não foi possível carregar</h1>
      <p className="text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-primary px-5 py-3 text-base font-bold text-accent transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        Tentar de novo
      </button>
    </section>
  )
}
