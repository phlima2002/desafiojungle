import { useEffect, useState, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  WALLET_PROVIDER_LABELS,
  collectorDetailsSchema,
  type CollectorDetails,
  type Network,
  type Wallet,
} from '@/shared/api/contracts'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { Breadcrumb } from '@/features/shell/breadcrumb'
import { MobileScreenHeader } from '@/features/shell/mobile-screen-header'
import { WalletProfileFields } from '@/features/account/wallet-profile-fields'
import { useCartQuery } from '@/features/cart/use-cart'
import { useSession } from '@/features/session/use-session'
import { useNftSubscription, useRealtime } from '@/features/realtime/realtime-provider'
import { useProfileQuery } from '@/features/account/use-account'
import { useQuote, usePlaceOrder, useWalletConnection, useWalletsQuery } from './use-checkout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function defaultsFrom(wallet: Wallet | null, email: string, username: string): CollectorDetails {
  return {
    displayName: wallet?.displayName ?? '',
    username,
    network: wallet?.network ?? 'ethereum',
    profileName: wallet?.profileName ?? '',
    address: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    provider: wallet?.provider ?? 'metamask',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? email,
    ensTld: wallet?.ensTld ?? '.eth',
    ensName: wallet?.ensName ?? '',
    note: '',
  }
}

export function CheckoutPage() {
  const networkLabelId = useId()
  const navigate = useNavigate()
  const { session } = useSession()
  const cart = useCartQuery()
  const wallets = useWalletsQuery()
  // O nome de usuário vive no perfil, não na sessão. Preencher o campo com o
  // nome de exibição deixava "Ana Ribeiro" num campo que não aceita espaço:
  // o colecionador só descobria ao tentar confirmar a compra.
  const profile = useProfileQuery()
  const { connect, disconnect } = useWalletConnection()

  const [networkOverride, setNetworkOverride] = useState<Network | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const [acknowledged, setAcknowledged] = useState<string | null>(null)

  const walletList = wallets.data?.items ?? []
  const selectedWallet = walletList.find((wallet) => wallet.id === walletId) ?? walletList[0] ?? null
  const network: Network = networkOverride ?? selectedWallet?.network ?? 'ethereum'

  const { quote, refresh, isPending: quoting, error: quoteError } = useQuote(network)
  const { phase, place, retry, reset } = usePlaceOrder()

  useNftSubscription((cart.data?.items ?? []).map((item) => item.nftId))

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

  const form = useForm<CollectorDetails>({
    resolver: zodResolver(collectorDetailsSchema),
    defaultValues: defaultsFrom(null, session?.user.email ?? '', profile.data?.username ?? ''),
  })

  // Prefilling from the wallet happens once per wallet, and never over
  // something the collector has already typed.
  const { reset: resetForm } = form
  const isDirty = form.formState.isDirty
  const selectedWalletId = selectedWallet?.id ?? null

  useEffect(() => {
    if (!selectedWallet || isDirty || useOtherWallet) return
    resetForm(defaultsFrom(selectedWallet, session?.user.email ?? '', profile.data?.username ?? ''))
    // `selectedWallet` is identified by its id: re-running on every object
    // identity would fight the collector's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWalletId, session?.user.email, profile.data?.username, useOtherWallet, resetForm])

  /**
   * "Usar outra carteira?" é do layout, e significa receber os NFTs num
   * endereço diferente do da carteira que paga: marcar limpa os campos de
   * endereço para o colecionador preencher, desmarcar traz os da carteira de
   * volta. Sem isso a caixa seria enfeite.
   */
  const toggleOtherWallet = (checked: boolean) => {
    setUseOtherWallet(checked)
    const values = form.getValues()
    resetForm(
      checked
        ? { ...values, address: '', secondaryAddress: '' }
        : {
            ...values,
            address: selectedWallet?.address ?? '',
            secondaryAddress: selectedWallet?.secondaryAddress ?? '',
          },
      { keepDirty: true },
    )
  }

  useEffect(() => {
    if (phase.kind === 'placed') {
      void navigate({ to: '/pedido/$orderId', params: { orderId: phase.order.id } })
    }
  }, [phase, navigate])

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
    <div className="mx-auto max-w-page px-4 py-6 sm:px-8 md:py-8">
      <MobileScreenHeader title="Pagamento com carteira" />
      <div className="hidden md:block">
        <Breadcrumb
          items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }, { label: 'Pagamento' }]}
        />
      </div>
      <h1 className="sr-only">Pagamento</h1>

      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-8 md:mt-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <section aria-labelledby="perfil-colecionador" className="min-w-0 space-y-6">
          <h2 id="perfil-colecionador" className="text-md font-bold">
            Perfil do colecionador
          </h2>

          <WalletProfileFields
            register={form.register as never}
            control={form.control as never}
            errors={form.formState.errors}
            variant="collector"
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="outra-carteira"
              checked={useOtherWallet}
              onCheckedChange={(checked) => toggleOtherWallet(checked === true)}
            />
            <Label htmlFor="outra-carteira" className="text-xs">
              Usar outra carteira?
            </Label>
          </div>

          <div className="max-w-md">
            <Label htmlFor="observacao">Observação do colecionador (opcional)</Label>
            <textarea
              id="observacao"
              rows={5}
              {...form.register('note')}
              aria-invalid={Boolean(form.formState.errors.note)}
              className="mt-1.5 w-full rounded-sm border border-line bg-card px-3 py-2.5 text-sm text-foreground"
            />
            {form.formState.errors.note ? (
              <p role="alert" className="mt-1 text-3xs text-danger">
                {form.formState.errors.note.message}
              </p>
            ) : null}
          </div>
        </section>

        <aside aria-labelledby="seus-nfts" className="h-fit space-y-4">
          <h2 id="seus-nfts" className="text-md font-bold">
            Seus NFTs
          </h2>

          <div className="flex items-baseline justify-between border-b border-line pb-2 text-sm font-bold">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>

          {quoting && !quote ? (
            <div className="skeleton h-40 w-full rounded-md" aria-hidden />
          ) : quoteError ? (
            <div role="alert" className="space-y-3 text-xs">
              <p className="text-danger">{quoteError.message}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refresh()}>
                Recalcular
              </Button>
            </div>
          ) : quote ? (
            <>
              <ul className="space-y-2">
                {quote.lines.map((line) => (
                  <li
                    key={line.cartItemId}
                    className="flex items-center gap-3 rounded-sm border border-line bg-card p-2"
                  >
                    <img
                      src={line.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="size-10 rounded-sm object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-3xs font-bold">{line.name}</span>
                      <span className="block truncate text-3xs text-muted">{line.editionLabel}</span>
                    </span>
                    <span className="text-3xs text-clay">(x {line.quantity})</span>
                    <span className="text-xs font-bold text-accent">{formatEthWithUnit(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <p className="text-center text-3xs text-muted">
                Tem um código promocional?{' '}
                <Link to="/carrinho" className="text-accent underline underline-offset-4">
                  Aplique aqui
                </Link>
              </p>

              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatEthWithUnit(quote.totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Desconto do lançamento</dt>
                  <dd className="text-success">(−) {formatEthWithUnit(quote.totals.discount)}</dd>
                </div>
                {/* Ver o comentário equivalente no carrinho: `<p>` solto dentro
                    de `<dl>` é markup inválido. */}
                <div className="flex justify-between">
                  <dt>Taxa de rede</dt>
                  <dd className="text-right">
                    {formatEthWithUnit(quote.totals.networkFee, 4)}
                    <span className="block text-3xs text-clay">Taxa estimada</span>
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="text-accent">{formatEthWithUnit(quote.totals.total, 4)}</dd>
                </div>
              </dl>
            </>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="w-full pb-2 text-center text-md font-bold">Carteira e rede</legend>

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
              <RadioGroup
                aria-label="Carteira usada na compra"
                value={selectedWallet?.id ?? ''}
                onValueChange={(value) => {
                  setWalletId(value)
                  setNetworkOverride(null)
                }}
              >
                {walletList.map((wallet) => {
                  const active = wallet.id === selectedWallet?.id
                  return (
                    <Label
                      key={wallet.id}
                      htmlFor={`carteira-${wallet.id}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-sm border p-3 transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-line',
                      )}
                    >
                      <RadioGroupItem id={`carteira-${wallet.id}`} value={wallet.id} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-3xs font-bold">
                          {WALLET_PROVIDER_LABELS[wallet.provider]}
                        </span>
                        <span className="block truncate text-3xs text-muted">
                          {wallet.label} · {NETWORK_LABELS[wallet.network]}
                        </span>
                      </span>
                      <Badge variant={wallet.connected ? 'success' : 'outline'} className="border-0">
                        {wallet.connected ? 'Conectada' : 'Desconectada'}
                      </Badge>
                    </Label>
                  )
                })}
              </RadioGroup>
            )}

            {selectedWallet ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    selectedWallet.connected
                      ? disconnect.mutate(selectedWallet.id)
                      : connect.mutate(selectedWallet.id)
                  }
                  disabled={connect.isPending || disconnect.isPending}
                  className="h-auto px-3 py-1.5 text-3xs"
                >
                  {selectedWallet.connected ? 'Desconectar' : 'Conectar carteira'}
                </Button>

                <div className="flex items-center gap-2 text-3xs">
                  <span id={networkLabelId}>Rede</span>
                  <Select value={network} onValueChange={(value) => setNetworkOverride(value as Network)}>
                    <SelectTrigger size="sm" aria-labelledby={networkLabelId} className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NETWORK_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {connect.isError ? (
              <p role="alert" className="text-3xs text-danger">
                {connect.error.message}
              </p>
            ) : null}
          </fieldset>

          {problems.length > 0 ? (
            <div role="status" className="space-y-2 rounded-sm border border-danger/40 bg-danger/10 p-3">
              <p className="text-3xs font-bold text-danger">Confira o que mudou antes de confirmar</p>
              <ul className="space-y-1 text-3xs text-muted">
                {problems.map((problem) => (
                  <li key={`${problem.cartItemId}-${problem.kind}`}>{problem.message}</li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => quote && setAcknowledged(quote.fingerprint)}
                className="h-auto px-3 py-1.5 text-3xs"
              >
                Revisar e recalcular
              </Button>
            </div>
          ) : null}

          {phase.kind === 'needs-review' ? (
            <div role="alert" className="space-y-2 rounded-sm border border-danger/40 bg-danger/10 p-3">
              <p className="text-3xs text-danger">{phase.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  reset()
                  setAcknowledged(null)
                  refresh()
                }}
                className="h-auto px-3 py-1.5 text-3xs"
              >
                Recalcular e revisar
              </Button>
            </div>
          ) : null}

          {phase.kind === 'failed' ? (
            <div role="alert" className="space-y-2">
              <p className="text-3xs text-danger">{phase.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void retry()}
                className="h-auto px-3 py-1.5 text-3xs"
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {selectedWallet && !selectedWallet.connected ? (
            <p className="text-3xs text-clay">Conecte a carteira para confirmar o pedido.</p>
          ) : null}

          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit}
            aria-busy={phase.kind === 'submitting'}
            className="w-full rounded-pill py-3 md:rounded-sm md:py-2"
          >
            {phase.kind === 'submitting' ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>

          <Button asChild variant="link" size="sm" className="w-full text-3xs font-normal text-sand">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        </aside>
      </form>
    </div>
  )
}
