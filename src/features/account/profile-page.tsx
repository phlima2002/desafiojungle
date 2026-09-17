import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  changePasswordRequestSchema,
  updateProfileRequestSchema,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
} from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { Field } from '@/features/auth/field'
import { useChangePassword, useProfileQuery, useUpdateAvatar, useUpdateProfile } from './use-account'

export function ProfilePage() {
  const profile = useProfileQuery()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const changePassword = useChangePassword()
  const fileInput = useRef<HTMLInputElement>(null)

  const form = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: { name: '', displayName: '', email: '', bio: '', website: '', location: '' },
  })

  const passwordForm = useForm<ChangePasswordRequest>({
    resolver: zodResolver(changePasswordRequestSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirmation: '' },
  })

  const { reset } = form
  useEffect(() => {
    if (profile.data) {
      reset({
        name: profile.data.name,
        displayName: profile.data.displayName,
        email: profile.data.email,
        bio: profile.data.bio,
        website: profile.data.website,
        location: profile.data.location,
      })
    }
  }, [profile.data, reset])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values)
    } catch (error) {
      if (isApiError(error)) {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          form.setError(field as keyof UpdateProfileRequest, { message })
        }
      }
    }
  })

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync(values)
      passwordForm.reset()
    } catch (error) {
      if (isApiError(error)) {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          passwordForm.setError(field as keyof ChangePasswordRequest, { message })
        }
      }
    }
  })

  if (profile.isPending) {
    return <div className="skeleton h-96 w-full rounded-md" aria-hidden />
  }

  return (
    <section className="space-y-10">
      <header>
        <h1 className="text-h1 font-bold">Perfil do colecionador</h1>
        <p className="mt-2 text-xs text-muted">Seus dados públicos e as credenciais da conta.</p>
      </header>

      <div className="flex items-center gap-4">
        {profile.data?.avatarUrl ? (
          <img
            src={profile.data.avatarUrl}
            alt={`Avatar de ${profile.data.displayName}`}
            width={72}
            height={72}
            className="size-18 rounded-pill object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-18 place-items-center rounded-pill bg-card-raised text-h3 font-bold text-accent"
          >
            {profile.data?.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="space-y-1">
          <input
            ref={fileInput}
            type="file"
            accept={AVATAR_MIME_TYPES.join(',')}
            className="sr-only"
            id="avatar"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) updateAvatar.mutate(file)
              event.target.value = ''
            }}
          />
          <label
            htmlFor="avatar"
            className="inline-block cursor-pointer rounded-sm border border-primary px-4 py-2 text-xs font-bold text-accent transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {updateAvatar.isPending ? 'Enviando…' : 'Trocar avatar'}
          </label>
          <p className="text-3xs text-clay">
            PNG, JPEG ou WebP, até {Math.round(MAX_AVATAR_BYTES / 1024 / 1024)} MB.
          </p>
          {updateAvatar.isError ? (
            <p role="alert" className="text-3xs text-danger">
              {updateAvatar.error.message}
            </p>
          ) : null}
          {updateAvatar.isSuccess ? (
            <p role="status" className="text-3xs text-success">
              Avatar atualizado.
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4">
        <h2 className="text-lg font-bold">Dados do perfil</h2>

        <Field label="Nome" error={form.formState.errors.name?.message}>
          {(props) => <input {...props} autoComplete="name" {...form.register('name')} />}
        </Field>
        <Field
          label="Nome de exibição"
          hint="Letras, números, ponto, hífen ou underline."
          error={form.formState.errors.displayName?.message}
        >
          {(props) => <input {...props} {...form.register('displayName')} />}
        </Field>
        <Field label="E-mail" error={form.formState.errors.email?.message}>
          {(props) => <input {...props} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Bio" error={form.formState.errors.bio?.message}>
          {(props) => <textarea {...props} rows={3} {...form.register('bio')} />}
        </Field>
        <Field label="Site" error={form.formState.errors.website?.message}>
          {(props) => <input {...props} type="url" inputMode="url" {...form.register('website')} />}
        </Field>
        <Field label="Localização" error={form.formState.errors.location?.message}>
          {(props) => <input {...props} {...form.register('location')} />}
        </Field>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-sm bg-primary px-5 py-3 text-xs font-bold text-primary-foreground uppercase disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Salvando…' : 'Salvar alterações'}
          </button>
          {updateProfile.isSuccess && !form.formState.isDirty ? (
            <p role="status" className="text-3xs text-success">
              Dados salvos.
            </p>
          ) : null}
        </div>
      </form>

      <form onSubmit={onChangePassword} noValidate className="max-w-xl space-y-4 border-t border-line pt-8">
        <h2 className="text-lg font-bold">Alterar senha</h2>

        <Field label="Senha atual" error={passwordForm.formState.errors.currentPassword?.message}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('currentPassword')}
            />
          )}
        </Field>
        <Field
          label="Nova senha"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={passwordForm.formState.errors.newPassword?.message}
        >
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('newPassword')}
            />
          )}
        </Field>
        <Field
          label="Confirmar nova senha"
          error={passwordForm.formState.errors.newPasswordConfirmation?.message}
        >
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('newPasswordConfirmation')}
            />
          )}
        </Field>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="rounded-sm border border-primary px-5 py-3 text-xs font-bold text-accent transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            {passwordForm.formState.isSubmitting ? 'Alterando…' : 'Alterar senha'}
          </button>
          {changePassword.isSuccess ? (
            <p role="status" className="text-3xs text-success">
              Senha alterada.
            </p>
          ) : null}
        </div>
      </form>
    </section>
  )
}
