import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  changePasswordRequestSchema,
  ensTldSchema,
  updateProfileRequestSchema,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
} from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { Field } from '@/features/auth/field'
import { PasswordInput } from './password-field'
import { useChangePassword, useProfileQuery, useUpdateAvatar, useUpdateProfile } from './use-account'
import { Input } from '@/components/ui/input'
import { FormSelect } from '@/components/form-select'
import { Button } from '@/components/ui/button'

export function ProfilePage() {
  const profile = useProfileQuery()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const changePassword = useChangePassword()
  const fileInput = useRef<HTMLInputElement>(null)

  const form = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      ensTld: '.eth',
      ensName: '',
      walletLabel: '',
    },
  })

  const passwordForm = useForm<ChangePasswordRequest>({
    resolver: zodResolver(changePasswordRequestSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirmation: '' },
  })

  const { reset } = form
  useEffect(() => {
    if (!profile.data) return
    reset({
      displayName: profile.data.displayName,
      username: profile.data.username,
      email: profile.data.email,
      ensTld: profile.data.ensTld,
      ensName: profile.data.ensName,
      walletLabel: profile.data.walletLabel,
    })
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
    <div className="space-y-10">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <h1 className="text-md font-bold">Perfil do colecionador</h1>

        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <Field label="Nome de exibição" required error={form.formState.errors.displayName?.message}>
            {(props) => <Input {...props} autoComplete="name" {...form.register('displayName')} />}
          </Field>

          <Field label="Nome de usuário" required error={form.formState.errors.username?.message}>
            {(props) => <Input {...props} autoComplete="username" {...form.register('username')} />}
          </Field>

          <Field label="E-mail" required error={form.formState.errors.email?.message}>
            {(props) => <Input {...props} type="email" autoComplete="email" {...form.register('email')} />}
          </Field>

          <Field
            label="Nome ENS"
            required
            error={form.formState.errors.ensName?.message ?? form.formState.errors.ensTld?.message}
          >
            {(props) => (
              <span className="flex gap-2">
                <span className="w-24 shrink-0">
                  <FormSelect
                    control={form.control}
                    name="ensTld"
                    aria-label="Domínio ENS"
                    options={ensTldSchema.options.map((tld) => ({ value: tld, label: tld }))}
                  />
                </span>
                <Input {...props} className="flex-1" {...form.register('ensName')} />
              </span>
            )}
          </Field>

          <Field label="Apelido da carteira" required error={form.formState.errors.walletLabel?.message}>
            {(props) => <Input {...props} {...form.register('walletLabel')} />}
          </Field>

          <div className="space-y-1.5">
            <p className="text-sm">Avatar</p>
            <div className="flex items-center gap-3">
              {profile.data?.avatarUrl ? (
                <img
                  src={profile.data.avatarUrl}
                  alt={`Avatar de ${profile.data.displayName}`}
                  width={40}
                  height={40}
                  className="size-10 rounded-pill object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-10 place-items-center rounded-pill bg-card-raised text-base font-bold text-accent"
                >
                  {profile.data?.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}

              <Input
                ref={fileInput}
                id="avatar"
                type="file"
                accept={AVATAR_MIME_TYPES.join(',')}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) updateAvatar.mutate(file)
                  event.target.value = ''
                }}
              />
              <label
                htmlFor="avatar"
                className="cursor-pointer rounded-sm bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                {updateAvatar.isPending ? 'Enviando…' : 'Alterar'}
              </label>
              <span className="text-xs text-sand">Remover</span>
            </div>
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

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            size="sm"
            disabled={form.formState.isSubmitting}
            className="h-auto px-6 py-2.5"
          >
            {form.formState.isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
          {updateProfile.isSuccess && !form.formState.isDirty ? (
            <p role="status" className="text-3xs text-success">
              Dados salvos.
            </p>
          ) : null}
        </div>
      </form>

      <form onSubmit={onChangePassword} noValidate className="max-w-md space-y-5 border-t border-line pt-8">
        <h2 className="text-md font-bold">Alterar senha</h2>

        <Field label="Senha atual" error={passwordForm.formState.errors.currentPassword?.message}>
          {(props) => (
            <PasswordInput
              {...props}
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
            <PasswordInput {...props} autoComplete="new-password" {...passwordForm.register('newPassword')} />
          )}
        </Field>

        <Field
          label="Confirmar nova senha"
          error={passwordForm.formState.errors.newPasswordConfirmation?.message}
        >
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              {...passwordForm.register('newPasswordConfirmation')}
            />
          )}
        </Field>

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            size="sm"
            disabled={passwordForm.formState.isSubmitting}
            className="h-auto px-6 py-2.5"
          >
            {passwordForm.formState.isSubmitting ? 'Alterando…' : 'Salvar'}
          </Button>
          {changePassword.isSuccess ? (
            <p role="status" className="text-3xs text-success">
              Senha alterada.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  )
}
