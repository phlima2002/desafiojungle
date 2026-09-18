import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { registerRequestSchema, type RegisterRequest } from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { useRegister } from '@/features/session/use-session'
import { PasswordInput } from '@/features/account/password-field'
import { Route } from '@/routes/criar-conta'
import { AuthCard } from './auth-card'
import { Field } from './field'

export function RegisterPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const register = useRegister()

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      acceptedTerms: true,
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values)
      await navigate({ to: search.redirect ?? '/', search: {} as never })
    } catch (error) {
      if (isApiError(error)) {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          form.setError(field as keyof RegisterRequest, { message })
        }
      }
    }
  })

  return (
    <AuthCard
      active="criar-conta"
      redirect={search.redirect}
      description="Crie sua conta para colecionar, favoritar e acompanhar seus pedidos."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {register.isError ? (
          <p
            role="alert"
            className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-2xs text-danger"
          >
            {register.error.message}
          </p>
        ) : null}

        <Field label="Nome" error={form.formState.errors.name?.message}>
          {(props) => <input {...props} autoComplete="name" {...form.register('name')} />}
        </Field>

        <Field label="E-mail" error={form.formState.errors.email?.message}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="contato@email.com"
              {...form.register('email')}
            />
          )}
        </Field>

        <Field
          label="Senha"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={form.formState.errors.password?.message}
        >
          {(props) => <PasswordInput {...props} autoComplete="new-password" {...form.register('password')} />}
        </Field>

        <Field label="Confirmar senha" error={form.formState.errors.passwordConfirmation?.message}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              {...form.register('passwordConfirmation')}
            />
          )}
        </Field>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-sm bg-primary px-5 py-3 text-base font-medium text-primary-foreground disabled:opacity-60"
        >
          {form.formState.isSubmitting ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
    </AuthCard>
  )
}
