import type { FieldErrors, UseFormRegister } from 'react-hook-form'
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

type ProfileForm = WalletInput | CollectorDetails

interface WalletProfileFieldsProps {
  register: UseFormRegister<never>
  errors: FieldErrors<ProfileForm>
  /**
   * The layout asks for a wallet nickname on the wallets screen and a username
   * on checkout — everything else is identical, so the two share this block.
   */
  variant: 'wallet' | 'collector'
}

export function WalletProfileFields({ register, errors, variant }: WalletProfileFieldsProps) {
  const field = register as unknown as UseFormRegister<ProfileForm>
  const walletErrors = errors as FieldErrors<WalletInput>
  const collectorErrors = errors as FieldErrors<CollectorDetails>

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <Field label="Nome de exibição" required error={errors.displayName?.message}>
        {(props) => <input {...props} autoComplete="nickname" {...field('displayName')} />}
      </Field>

      {variant === 'wallet' ? (
        <Field label="Apelido da carteira" required error={walletErrors.label?.message}>
          {(props) => <input {...props} {...field('label' as keyof ProfileForm)} />}
        </Field>
      ) : (
        <Field label="Nome de usuário" required error={collectorErrors.username?.message}>
          {(props) => (
            <input {...props} autoComplete="username" {...field('username' as keyof ProfileForm)} />
          )}
        </Field>
      )}

      <Field label="Rede" required error={errors.network?.message}>
        {(props) => (
          <select {...props} {...field('network')}>
            {networkSchema.options.map((network) => (
              <option key={network} value={network}>
                {NETWORK_LABELS[network]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Nome do perfil" required error={errors.profileName?.message}>
        {(props) => <input {...props} {...field('profileName')} />}
      </Field>

      <Field label="Endereço da carteira" required error={errors.address?.message}>
        {(props) => (
          <input {...props} spellCheck={false} placeholder="Endereço 0x da carteira" {...field('address')} />
        )}
      </Field>

      <Field label="ENS ou carteira secundária" error={errors.secondaryAddress?.message}>
        {(props) => (
          <input
            {...props}
            spellCheck={false}
            placeholder="ENS ou carteira secundária (opcional)"
            {...field('secondaryAddress')}
          />
        )}
      </Field>

      <Field label="Tipo de carteira" required error={errors.provider?.message}>
        {(props) => (
          <select {...props} {...field('provider')}>
            {walletProviderSchema.options.map((provider) => (
              <option key={provider} value={provider}>
                {WALLET_PROVIDER_LABELS[provider]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Código de indicação" required error={errors.referralCode?.message}>
        {(props) => <input {...props} {...field('referralCode')} />}
      </Field>

      <Field label="E-mail" required error={errors.email?.message}>
        {(props) => <input {...props} type="email" autoComplete="email" {...field('email')} />}
      </Field>

      <Field label="Nome ENS" required error={errors.ensName?.message ?? errors.ensTld?.message}>
        {(props) => (
          <span className="flex gap-2">
            <select
              aria-label="Domínio ENS"
              {...field('ensTld')}
              className="rounded-sm border border-line bg-card px-2 py-2.5 text-sm text-foreground"
            >
              {ensTldSchema.options.map((tld) => (
                <option key={tld} value={tld}>
                  {tld}
                </option>
              ))}
            </select>
            <input {...props} className={`${props.className} flex-1`} {...field('ensName')} />
          </span>
        )}
      </Field>
    </div>
  )
}
