import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import {
  WALLET_PROVIDER_LABELS,
  ensTldSchema,
  networkSchema,
  walletProviderSchema,
  type CollectorDetails,
  type WalletInput,
} from '@/shared/api/contracts'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { Field } from '@/features/auth/field'
import { Input } from '@/components/ui/input'
import { FormSelect } from '@/components/form-select'

type ProfileForm = WalletInput | CollectorDetails

interface WalletProfileFieldsProps {
  register: UseFormRegister<never>
  control: Control<never>
  errors: FieldErrors<ProfileForm>
  /**
   * The layout asks for a wallet nickname on the wallets screen and a username
   * on checkout — everything else is identical, so the two share this block.
   */
  variant: 'wallet' | 'collector'
}

export function WalletProfileFields({ register, control, errors, variant }: WalletProfileFieldsProps) {
  const field = register as unknown as UseFormRegister<ProfileForm>
  const formControl = control as unknown as Control<ProfileForm>
  const walletErrors = errors as FieldErrors<WalletInput>
  const collectorErrors = errors as FieldErrors<CollectorDetails>

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <Field label="Nome de exibição" required error={errors.displayName?.message}>
        {(props) => <Input {...props} autoComplete="nickname" {...field('displayName')} />}
      </Field>

      {variant === 'wallet' ? (
        <Field label="Apelido da carteira" required error={walletErrors.label?.message}>
          {(props) => <Input {...props} {...field('label' as keyof ProfileForm)} />}
        </Field>
      ) : (
        <Field label="Nome de usuário" required error={collectorErrors.username?.message}>
          {(props) => (
            <Input {...props} autoComplete="username" {...field('username' as keyof ProfileForm)} />
          )}
        </Field>
      )}

      <Field label="Rede" required error={errors.network?.message}>
        {(props) => (
          <FormSelect
            {...props}
            control={formControl}
            name="network"
            options={networkSchema.options.map((network) => ({
              value: network,
              label: NETWORK_LABELS[network],
            }))}
          />
        )}
      </Field>

      <Field label="Nome do perfil" required error={errors.profileName?.message}>
        {(props) => <Input {...props} {...field('profileName')} />}
      </Field>

      <Field label="Endereço da carteira" required error={errors.address?.message}>
        {(props) => (
          <Input {...props} spellCheck={false} placeholder="Endereço 0x da carteira" {...field('address')} />
        )}
      </Field>

      <Field label="ENS ou carteira secundária" error={errors.secondaryAddress?.message}>
        {(props) => (
          <Input
            {...props}
            spellCheck={false}
            placeholder="ENS ou carteira secundária (opcional)"
            {...field('secondaryAddress')}
          />
        )}
      </Field>

      <Field label="Tipo de carteira" required error={errors.provider?.message}>
        {(props) => (
          <FormSelect
            {...props}
            control={formControl}
            name="provider"
            options={walletProviderSchema.options.map((provider) => ({
              value: provider,
              label: WALLET_PROVIDER_LABELS[provider],
            }))}
          />
        )}
      </Field>

      <Field label="Código de indicação" required error={errors.referralCode?.message}>
        {(props) => <Input {...props} {...field('referralCode')} />}
      </Field>

      <Field label="E-mail" required error={errors.email?.message}>
        {(props) => <Input {...props} type="email" autoComplete="email" {...field('email')} />}
      </Field>

      <Field label="Nome ENS" required error={errors.ensName?.message ?? errors.ensTld?.message}>
        {(props) => (
          <span className="flex gap-2">
            <span className="w-24 shrink-0">
              <FormSelect
                control={formControl}
                name="ensTld"
                aria-label="Domínio ENS"
                options={ensTldSchema.options.map((tld) => ({ value: tld, label: tld }))}
              />
            </span>
            <Input {...props} className="flex-1" {...field('ensName')} />
          </span>
        )}
      </Field>
    </div>
  )
}
