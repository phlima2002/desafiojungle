import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { loginRequestSchema, type LoginRequest } from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { useLogin } from '@/features/session/use-session'
import { Route } from '@/routes/entrar'
import { Field } from './field'

export function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const login = useLogin()

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values)
      await navigate({ to: search.redirect ?? '/', search: {} as never })
    } catch (error) {
      if (isApiError(error)) {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          form.setError(field as keyof LoginRequest, { message })
        }
      }
    }
  })

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-h1 font-bold">Entrar</h1>
      <p className="mt-2 text-2xs text-muted">Entre para gerenciar sua carteira, coleção e pedidos.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        {login.isError ? (
          <p role="alert" className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            {login.error.message}
          </p>
        ) : null}

        <Field label="E-mail" error={form.formState.errors.email?.message}>
          {(props) => <input {...props} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>

        <Field label="Senha" error={form.formState.errors.password?.message}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          )}
        </Field>

        <label className="flex items-center gap-2 text-2xs text-muted">
          <input
            type="checkbox"
            {...form.register('remember')}
            className="size-4 accent-[var(--color-primary)]"
          />
          Manter conectado
        </label>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-sm bg-primary px-5 py-3 text-base font-medium text-primary-foreground disabled:opacity-60"
        >
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-2xs text-muted">
        Ainda não tem conta?{' '}
        <Link to="/criar-conta" search={{}} className="font-bold text-accent underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </section>
  )
}
