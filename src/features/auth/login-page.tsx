import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { loginRequestSchema, type LoginRequest } from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { useLogin } from '@/features/session/use-session'
import { PasswordInput } from '@/features/account/password-field'
import { Route } from '@/routes/entrar'
import { AuthCard } from './auth-card'
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
    <AuthCard
      active="entrar"
      redirect={search.redirect}
      description="Entre para gerenciar sua carteira, coleção e perfil de criador."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {login.isError ? (
          <p role="alert" className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-2xs text-danger">
            {login.error.message}
          </p>
        ) : null}

        <Field label="E-mail" error={form.formState.errors.email?.message}>
          {(props) => (
            <input {...props} type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />
          )}
        </Field>

        <Field label="Senha" error={form.formState.errors.password?.message}>
          {(props) => (
            <PasswordInput {...props} autoComplete="current-password" {...form.register('password')} />
          )}
        </Field>

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-2xs text-muted">
            <input
              type="checkbox"
              {...form.register('remember')}
              className="size-4 accent-[var(--color-primary)]"
            />
            Manter conectado
          </label>
          <span
            title="Recuperação de senha não faz parte do escopo do desafio"
            className="cursor-not-allowed text-2xs text-clay"
          >
            Esqueceu a senha?
          </span>
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-sm bg-primary px-5 py-3 text-base font-medium text-primary-foreground disabled:opacity-60"
        >
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthCard>
  )
}
