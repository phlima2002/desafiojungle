import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  networkSchema,
  walletInputSchema,
  walletProviderSchema,
  walletRoleSchema,
  type Wallet,
  type WalletInput,
} from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/utils'
import { Field } from '@/features/auth/field'
import { useWallets } from './use-account'

const PROVIDER_LABELS: Record<string, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  ledger: 'Ledger',
}

const NETWORK_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const EMPTY: WalletInput = {
  label: '',
  provider: 'metamask',
  network: 'ethereum',
  address: '',
  role: 'secondary',
}

export function WalletsPage() {
  const { query, create, update, connect, disconnect } = useWallets()
  const [editing, setEditing] = useState<Wallet | null>(null)

  const form = useForm<WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: EMPTY,
  })

  const { reset } = form
  useEffect(() => {
    reset(
      editing
        ? {
            label: editing.label,
            provider: editing.provider,
            network: editing.network,
            address: editing.address,
            role: editing.role,
          }
        : EMPTY,
    )
  }, [editing, reset])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, body: values })
      else await create.mutateAsync(values)
      setEditing(null)
      form.reset(EMPTY)
    } catch (error) {
      if (isApiError(error)) {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          form.setError(field as keyof WalletInput, { message })
        }
        if (error.details.length === 0) form.setError('root', { message: error.message })
      }
    }
  })

  const wallets = query.data?.items ?? []

  return (
    <section className="space-y-10">
      <header>
        <h1 className="text-h1 font-bold">Carteiras</h1>
        <p className="mt-2 text-xs text-muted">
          Cadastre a carteira principal e uma secundária. A conexão é simulada — nenhuma extensão real é
          acionada.
        </p>
      </header>

      {query.isPending ? (
        <div className="skeleton h-40 w-full rounded-md" aria-hidden />
      ) : wallets.length === 0 ? (
        <p className="rounded-md border border-line bg-card p-5 text-xs text-muted">
          Nenhuma carteira cadastrada ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {wallets.map((wallet) => (
            <li
              key={wallet.id}
              className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-card p-4"
            >
              <div className="min-w-40 flex-1">
                <p className="flex items-center gap-2 text-xs font-bold">
                  {wallet.label}
                  <span
                    className={cn(
                      'rounded-xs px-2 py-0.5 text-3xs font-bold',
                      wallet.role === 'primary'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card-raised text-sand',
                    )}
                  >
                    {wallet.role === 'primary' ? 'Principal' : 'Secundária'}
                  </span>
                </p>
                <p className="text-3xs text-muted">
                  {PROVIDER_LABELS[wallet.provider]} · {NETWORK_LABELS[wallet.network]}
                </p>
                <p className="truncate text-3xs text-clay">{wallet.address}</p>
              </div>

              <p className={cn('text-3xs font-bold', wallet.connected ? 'text-success' : 'text-clay')}>
                {wallet.connected ? 'Conectada' : 'Desconectada'}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    wallet.connected ? disconnect.mutate(wallet.id) : connect.mutate(wallet.id)
                  }
                  className="rounded-sm border border-line px-3 py-1.5 text-3xs font-bold text-sand transition-colors hover:border-primary hover:text-accent"
                >
                  {wallet.connected ? 'Desconectar' : 'Conectar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(wallet)}
                  className="rounded-sm border border-line px-3 py-1.5 text-3xs font-bold text-sand transition-colors hover:border-primary hover:text-accent"
                >
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {connect.isError ? (
        <p role="alert" className="text-3xs text-danger">
          {connect.error.message}
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4 border-t border-line pt-8">
        <h2 className="text-lg font-bold">{editing ? `Editar ${editing.label}` : 'Nova carteira'}</h2>

        {form.formState.errors.root ? (
          <p role="alert" className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Field label="Apelido" error={form.formState.errors.label?.message}>
          {(props) => <input {...props} {...form.register('label')} />}
        </Field>

        <Field label="Provedor" error={form.formState.errors.provider?.message}>
          {(props) => (
            <select {...props} {...form.register('provider')}>
              {walletProviderSchema.options.map((provider) => (
                <option key={provider} value={provider}>
                  {PROVIDER_LABELS[provider]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Rede" error={form.formState.errors.network?.message}>
          {(props) => (
            <select {...props} {...form.register('network')}>
              {networkSchema.options.map((network) => (
                <option key={network} value={network}>
                  {NETWORK_LABELS[network]}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Endereço"
          hint="Ethereum e Polygon usam 0x + 40 caracteres; Solana usa base58."
          error={form.formState.errors.address?.message}
        >
          {(props) => <input {...props} spellCheck={false} {...form.register('address')} />}
        </Field>

        <Field label="Função" error={form.formState.errors.role?.message}>
          {(props) => (
            <select {...props} {...form.register('role')}>
              {walletRoleSchema.options.map((role) => (
                <option key={role} value={role}>
                  {role === 'primary' ? 'Principal' : 'Secundária'}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-sm bg-primary px-5 py-3 text-xs font-bold text-primary-foreground uppercase disabled:opacity-60"
          >
            {editing ? 'Salvar carteira' : 'Cadastrar carteira'}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-3xs text-sand underline underline-offset-4"
            >
              cancelar edição
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
