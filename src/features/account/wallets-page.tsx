import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  WALLET_PROVIDER_LABELS,
  walletInputSchema,
  type Wallet,
  type WalletInput,
} from '@/shared/api/contracts'
import { isApiError } from '@/shared/api/errors'
import { cn } from '@/shared/lib/utils'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { useWallets } from './use-account'
import { WalletProfileFields } from './wallet-profile-fields'

const EMPTY: WalletInput = {
  label: '',
  displayName: '',
  profileName: '',
  network: 'ethereum',
  address: '',
  secondaryAddress: '',
  provider: 'metamask',
  referralCode: '',
  email: '',
  ensTld: '.eth',
  ensName: '',
  role: 'primary',
}

function toInput(wallet: Wallet): WalletInput {
  const { id: _id, connected: _connected, createdAt: _createdAt, ...input } = wallet
  return input
}

export function WalletsPage() {
  const { query, create, update, connect, disconnect } = useWallets()
  const [editing, setEditing] = useState<Wallet | null>(null)

  const form = useForm<WalletInput>({ resolver: zodResolver(walletInputSchema), defaultValues: EMPTY })
  const { reset } = form

  useEffect(() => {
    reset(editing ? toInput(editing) : EMPTY)
  }, [editing, reset])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, body: values })
      else await create.mutateAsync(values)
      setEditing(null)
      reset(EMPTY)
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
  const primary = wallets.find((wallet) => wallet.role === 'primary') ?? null
  const secondary = wallets.filter((wallet) => wallet.role === 'secondary')

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-md font-bold">Carteira principal</h1>
          <p className="mt-1 text-3xs text-muted">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            reset({ ...EMPTY, role: 'primary' })
          }}
          className="text-xs font-bold text-accent underline underline-offset-4"
        >
          Adicionar
        </button>
      </header>

      {query.isPending ? (
        <div className="skeleton h-32 w-full rounded-md" aria-hidden />
      ) : wallets.length > 0 ? (
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
                  {WALLET_PROVIDER_LABELS[wallet.provider]} · {NETWORK_LABELS[wallet.network]} ·{' '}
                  {wallet.ensName}
                  {wallet.ensTld}
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
      ) : null}

      {connect.isError ? (
        <p role="alert" className="text-3xs text-danger">
          {connect.error.message}
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <h2 className="sr-only">{editing ? `Editar ${editing.label}` : 'Nova carteira'}</h2>

        {form.formState.errors.root ? (
          <p role="alert" className="rounded-sm border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <WalletProfileFields
          register={form.register as never}
          errors={form.formState.errors}
          variant="wallet"
        />

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-sm bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {editing ? 'Salvar carteira' : 'Cadastrar carteira'}
          </button>

          <label className="flex items-center gap-2 text-3xs text-muted">
            <input type="checkbox" {...form.register('role')} value="primary" className="sr-only" />
          </label>

          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-3xs text-sand underline underline-offset-4"
            >
              cancelar edição
            </button>
          ) : null}

          <label className="flex items-center gap-2 text-3xs">
            <span>Função</span>
            <select
              aria-label="Função da carteira"
              {...form.register('role')}
              className="rounded-sm border border-line bg-card px-2 py-1 text-3xs"
            >
              <option value="primary">Principal</option>
              <option value="secondary">Secundária</option>
            </select>
          </label>
        </div>
      </form>

      <section className="border-t border-line pt-6">
        <h2 className="text-md font-bold">Carteira secundária</h2>
        <p className="mt-1 text-3xs text-muted">
          {secondary.length > 0
            ? `${secondary.length} carteira(s) secundária(s) cadastrada(s).`
            : 'Você ainda não adicionou uma carteira secundária.'}
        </p>
        {primary ? (
          <p className="mt-2 text-3xs text-clay">
            Principal atual: {primary.label} ({NETWORK_LABELS[primary.network]})
          </p>
        ) : null}
      </section>
    </section>
  )
}
