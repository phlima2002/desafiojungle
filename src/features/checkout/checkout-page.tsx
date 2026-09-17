import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  collectorDetailsSchema,
  networkSchema,
  type CollectorDetails,
  type Network,
} from '@/shared/api/contracts'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { Field } from '@/features/auth/field'
import { useCartQuery } from '@/features/cart/use-cart'
import { useSession } from '@/features/session/use-session'
import { useNftSubscription, useRealtime } from '@/features/realtime/realtime-provider'
import { useQuote, usePlaceOrder, useWalletConnection, useWalletsQuery } from './use-checkout'

const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const cart = useCartQuery()
  const wallets = useWalletsQuery()
  const { connect, disconnect } = useWalletConnection()

  const [networkOverride, setNetworkOverride] = useState<Network | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const { phase, place, retry, reset } = usePlaceOrder()

  useNftSubscription((cart.data?.items ?? []).map((item) => item.nftId))

  const form = useForm<CollectorDetails>({
    resolver: zodResolver(collectorDetailsSchema),
    defaultValues: {
      fullName: session?.user.name ?? '',
      email: session?.user.email ?? '',
      country: 'Brasil',
      taxId: '',
    },
  })

  // Derived during render rather than synchronised in an effect: the first
  // wallet is the default until the collector picks another, and the network
  // follows the wallet until it is overridden explicitly.
  const walletList = wallets.data?.items ?? []
  const selectedWallet = walletList.find((wallet) => wallet.id === walletId) ?? walletList[0] ?? null
  const network: Network = networkOverride ?? selectedWallet?.network ?? 'ethereum'

  const { quote, refresh, isPending: quoting, error: quoteError } = useQuote(network)

  // A catalogue change that touches a line of this order invalidates the quote:
  // re-pricing here is what makes a stale quote impossible to slip past.
  const { lastNftChange } = useRealtime()
  const affectedLine =
    lastNftChange && quote?.lines.some((line) => line.nftId === lastNftChange.resourceId)
      ? `${lastNftChange.resourceId}:${lastNftChange.version}`
      : null

  useEffect(() => {
    if (affectedLine) refresh()
  }, [affectedLine, refresh])

  useEffect(() => {
    if (phase.kind === 'placed') {
      void navigate({ to: '/pedido/$orderId', params: { orderId: phase.order.id } })
    }
  }, [phase, navigate])

  // Acknowledging is per-quote: the collector confirms *these* numbers. Any
  // later change produces a new fingerprint and blocks the button again.
  const [acknowledged, setAcknowledged] = useState<string | null>(null)
  const problems = quote?.problems ?? []
  const needsAcknowledgement =
    (problems.length > 0 || phase.kind === 'needs-review') && quote?.fingerprint !== acknowledged

  const canSubmit =
    Boolean(quote) &&
    Boolean(selectedWallet?.connected) &&
    !quoting &&
    phase.kind !== 'submitting' &&
    phase.kind !== 'recovering' &&
    !needsAcknowledgement

  const onSubmit = form.handleSubmit((collector) => {
    if (!quote || !selectedWallet) return
    void place({
      quoteId: quote.id,
      quoteFingerprint: quote.fingerprint,
      walletId: selectedWallet.id,
      network,
      collector,
    })
  })

  if (phase.kind === 'recovering') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center" aria-busy="true">
        <h1 className="text-h1 font-bold">Recuperando seu pedido</h1>
        <p role="status" className="mt-4 text-sm text-muted">
          Uma compra ficou sem resposta. Estamos confirmando com o servidor usando a mesma chave de
          idempotência — nenhum segundo pedido será criado.
        </p>
        <div className="skeleton mx-auto mt-8 h-24 w-full max-w-md rounded-md" aria-hidden />
      </section>
    )
  }

  if (cart.isSuccess && cart.data.items.length === 0 && phase.kind !== 'placed') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-h1 font-bold">Pagamento</h1>
        <p className="mt-4 text-sm text-muted">Seu carrinho está vazio.</p>
        <Link
          to="/mercado"
          search={{}}
          className="mt-6 inline-block rounded-sm bg-primary px-5 py-3 text-xs font-bold text-primary-foreground uppercase"
        >
          Explorar catálogo
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-page px-4 py-10 sm:px-8">
      <h1 className="text-h1 font-bold">Pagamento</h1>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <fieldset className="space-y-4 rounded-md border border-line bg-card p-6">
            <legend className="px-1 text-lg font-bold">Dados do colecionador</legend>

            <Field label="Nome completo" error={form.formState.errors.fullName?.message}>
              {(props) => <input {...props} autoComplete="name" {...form.register('fullName')} />}
            </Field>
            <Field label="E-mail" error={form.formState.errors.email?.message}>
              {(props) => <input {...props} type="email" autoComplete="email" {...form.register('email')} />}
            </Field>
            <Field label="País" error={form.formState.errors.country?.message}>
              {(props) => <input {...props} autoComplete="country-name" {...form.register('country')} />}
            </Field>
            <Field
              label="Documento"
              hint="CPF ou identificador fiscal equivalente."
              error={form.formState.errors.taxId?.message}
            >
              {(props) => <input {...props} inputMode="numeric" {...form.register('taxId')} />}
            </Field>
          </fieldset>

          <fieldset className="space-y-4 rounded-md border border-line bg-card p-6">
            <legend className="px-1 text-lg font-bold">Carteira e rede</legend>

            {wallets.isPending ? (
              <div className="skeleton h-24 w-full" aria-hidden />
            ) : walletList.length === 0 ? (
              <p className="text-xs text-muted">
                Você ainda não cadastrou uma carteira.{' '}
                <Link to="/conta/carteiras" className="text-accent underline underline-offset-4">
                  Cadastrar agora
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {walletList.map((wallet) => {
                  const active = wallet.id === selectedWallet?.id
                  return (
                    <li key={wallet.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-sm border p-4 transition-colors',
                          active ? 'border-primary bg-primary/5' : 'border-line',
                        )}
                      >
                        <input
                          type="radio"
                          name="wallet"
                          value={wallet.id}
                          checked={active}
                          onChange={() => {
                            setWalletId(wallet.id)
                            setNetworkOverride(null)
                          }}
                          className="accent-[var(--color-primary)]"
                        />
                        <span className="flex-1">
                          <span className="block text-xs font-bold">{wallet.label}</span>
                          <span className="block text-3xs text-muted">
                            {NETWORK_LABELS[wallet.network]} · {wallet.address.slice(0, 10)}…
                            {wallet.address.slice(-6)}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'text-3xs font-bold',
                            wallet.connected ? 'text-success' : 'text-clay',
                          )}
                        >
                          {wallet.connected ? 'Conectada' : 'Desconectada'}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}

            {selectedWallet ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    selectedWallet.connected
                      ? disconnect.mutate(selectedWallet.id)
                      : connect.mutate(selectedWallet.id)
                  }
                  disabled={connect.isPending || disconnect.isPending}
                  className="rounded-sm border border-primary px-4 py-2 text-xs font-bold text-accent transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {selectedWallet.connected ? 'Desconectar' : 'Conectar carteira'}
                </button>

                <label className="flex items-center gap-2 text-xs">
                  <span>Rede</span>
                  <select
                    value={network}
                    onChange={(event) => setNetworkOverride(networkSchema.parse(event.target.value))}
                    className="rounded-sm border border-line bg-card-raised px-2 py-1 text-xs"
                  >
                    {Object.entries(NETWORK_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {connect.isError ? (
              <p role="alert" className="text-3xs text-danger">
                {connect.error.message}
              </p>
            ) : null}
          </fieldset>
        </div>

        <aside className="h-fit space-y-4 rounded-md border border-line bg-card p-6">
          <h2 className="text-lg font-bold">Revisão do pedido</h2>

          {quoting && !quote ? (
            <div className="skeleton h-48 w-full" aria-hidden />
          ) : quoteError ? (
            <div role="alert" className="space-y-3 text-xs">
              <p className="text-danger">{quoteError.message}</p>
              <button
                type="button"
                onClick={() => refresh()}
                className="rounded-sm border border-primary px-4 py-2 text-xs font-bold text-accent"
              >
                Recalcular
              </button>
            </div>
          ) : quote ? (
            <>
              <ul className="space-y-3">
                {quote.lines.map((line) => (
                  <li key={line.cartItemId} className="flex items-center gap-3">
                    <img
                      src={line.imageUrl}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                      className="size-11 rounded-sm object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-3xs font-bold">{line.name}</span>
                      <span className="block text-3xs text-muted">
                        {line.editionLabel} · {line.quantity}×
                      </span>
                    </span>
                    <span className="text-3xs">{formatEthWithUnit(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-2 border-t border-line pt-4 text-xs">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatEthWithUnit(quote.totals.subtotal)}</dd>
                </div>
                {quote.coupon ? (
                  <div className="flex justify-between">
                    <dt>Cupom {quote.coupon.code}</dt>
                    <dd className="text-success">−{formatEthWithUnit(quote.totals.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt>Taxa de rede ({NETWORK_LABELS[quote.network]})</dt>
                  <dd>{formatEthWithUnit(quote.totals.networkFee, 4)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="text-accent">{formatEthWithUnit(quote.totals.total, 4)}</dd>
                </div>
              </dl>
            </>
          ) : null}

          {problems.length > 0 ? (
            <div role="status" className="space-y-2 rounded-sm border border-danger/40 bg-danger/10 p-3">
              <p className="text-3xs font-bold text-danger">Confira o que mudou antes de confirmar</p>
              <ul className="space-y-1 text-3xs text-muted">
                {problems.map((problem) => (
                  <li key={`${problem.cartItemId}-${problem.kind}`}>{problem.message}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => quote && setAcknowledged(quote.fingerprint)}
                className="rounded-sm border border-primary px-3 py-1.5 text-3xs font-bold text-accent"
              >
                Revisar e recalcular
              </button>
            </div>
          ) : null}

          {phase.kind === 'needs-review' ? (
            <div role="alert" className="space-y-2 rounded-sm border border-danger/40 bg-danger/10 p-3">
              <p className="text-3xs text-danger">{phase.message}</p>
              <button
                type="button"
                onClick={() => {
                  reset()
                  setAcknowledged(null)
                  refresh()
                }}
                className="rounded-sm border border-primary px-3 py-1.5 text-3xs font-bold text-accent"
              >
                Recalcular e revisar
              </button>
            </div>
          ) : null}

          {phase.kind === 'failed' ? (
            <div role="alert" className="space-y-2">
              <p className="text-3xs text-danger">{phase.message}</p>
              <button
                type="button"
                onClick={() => void retry()}
                className="rounded-sm border border-primary px-3 py-1.5 text-3xs font-bold text-accent"
              >
                Tentar de novo
              </button>
            </div>
          ) : null}

          {selectedWallet && !selectedWallet.connected ? (
            <p className="text-3xs text-clay">Conecte a carteira para confirmar o pedido.</p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={phase.kind === 'submitting'}
            className="w-full rounded-sm bg-primary px-5 py-3 text-xs font-bold text-primary-foreground uppercase disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase.kind === 'submitting' ? 'Enviando pedido…' : 'Confirmar compra'}
          </button>

          <Link to="/carrinho" className="block text-center text-3xs text-sand underline underline-offset-4">
            Voltar ao carrinho
          </Link>
        </aside>
      </form>
    </section>
  )
}
