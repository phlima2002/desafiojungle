import type { ErrorComponentProps } from '@tanstack/react-router'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/components/ui/button'

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message = isApiError(error) ? error.message : 'Algo deu errado ao carregar esta página.'

  return (
    <section
      role="alert"
      className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-h2 font-bold">Não foi possível carregar</h1>
      <p className="text-sm text-muted">{message}</p>
      <Button type="button" variant="outline" onClick={reset} className="rounded-md">
        Tentar de novo
      </Button>
    </section>
  )
}
