import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { checkoutApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { useSession } from '@/features/session/use-session'
import { useRealtime } from '@/features/realtime/realtime-provider'
import { useEffect } from 'react'

const HEADLINE = {
  pending: 'Estamos confirmando sua compra',
  confirmed: 'Seus NFTs agora estão na sua carteira',
  declined: 'Não foi possível concluir a compra',
} as const

function Envelope() {
  return (
    <svg viewBox="0 0 64 56" width="64" height="56" aria-hidden className="mx-auto text-primary">
      <rect x="1" y="9" width="62" height="46" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M1 13 32 33 63 13" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect
        x="14"
        y="1"
        width="36"
        height="22"
        rx="3"
        fill="var(--color-ink-900)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <text
        x="32"
        y="10"
        textAnchor="middle"
        fill="currentColor"
        fontSize="6"
        fontFamily="var(--font-mono)"
        fontWeight="700"
      >
        THANK
      </text>
      <text
        x="32"
        y="18"
        textAnchor="middle"
        fill="currentColor"
        fontSize="6"
        fontFamily="var(--font-mono)"
        fontWeight="700"
      >
        YOU
      </text>
    </svg>
  )
}

export function OrderConfirmationPage({ orderId }: { orderId: string }) {
  const { scope } = useSession()
  const { subscribeOrders, unsubscribeOrders } = useRealtime()

  const order = useQuery({
    queryKey: queryKeys.order(scope, orderId),
    queryFn: ({ signal }) => checkoutApi.getOrder(orderId, signal),
    ...cachePolicy.order,
    // A pending order is polled until it reaches a terminal state, so the page
    // recovers even if the realtime event was missed while offline.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2_000 : false),
  })

  useEffect(() => {
    subscribeOrders([orderId])
    return () => unsubscribeOrders([orderId])
  }, [orderId, subscribeOrders, unsubscribeOrders])

  if (order.isPending) {
    return <div className="skeleton mx-auto my-16 h-96 max-w-2xl rounded-md" aria-hidden />
  }

  if (order.isError) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-h2 font-bold">Pedido não encontrado</h1>
        <p role="alert" className="mt-3 text-sm text-danger">
          {order.error.message}
        </p>
        <Link
          to="/mercado"
          search={{}}
          className="mt-6 inline-block rounded-sm bg-primary px-5 py-3 text-xs font-bold text-primary-foreground"
        >
          Voltar ao mercado
        </Link>
      </section>
    )
  }

  const data = order.data
  const placedAt = new Date(data.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="overflow-hidden rounded-md border border-line bg-card">
        <div className="space-y-4 px-6 pt-8 text-center">
          <Envelope />
          <h1 className="text-sm font-bold" aria-live="polite">
            {HEADLINE[data.status]}
          </h1>
          {data.status === 'pending' ? (
            <p role="status" className="text-3xs text-muted">
              Aguardando a confirmação da transação. Você pode recarregar a página com segurança — o pedido
              não será duplicado.
            </p>
          ) : null}
          {data.status === 'declined' && data.declineReason ? (
            <p role="alert" className="text-3xs text-danger">
              {data.declineReason}
            </p>
          ) : null}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
          <div className="bg-card px-4 py-3">
            <dt className="text-3xs font-bold">ID da transação</dt>
            <dd className="truncate text-3xs text-muted">
              {data.transactionHash
                ? `${data.transactionHash.slice(0, 8)}…${data.transactionHash.slice(-4)}`
                : '—'}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-3xs font-bold">Data</dt>
            <dd className="text-3xs text-muted">{placedAt}</dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-3xs font-bold">Total</dt>
            <dd className="text-3xs text-muted">{formatEthWithUnit(data.totals.total, 4)}</dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-3xs font-bold">Carteira</dt>
            <dd className="truncate text-3xs text-muted">
              {data.walletAddress.slice(0, 6)}…{data.walletAddress.slice(-4)}
            </dd>
          </div>
        </dl>

        <div className="px-6 py-6">
          <h2 className="text-sm font-bold">Detalhes da transação</h2>

          <table className="mt-4 w-full border-collapse text-left">
            <caption className="sr-only">Itens comprados neste pedido</caption>
            <thead>
              <tr className="text-3xs font-bold">
                <th scope="col" className="pb-2">
                  NFTs
                </th>
                <th scope="col" className="pb-2 text-right">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={`${item.nftId}-${item.editionId}`}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="size-10 rounded-sm object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-3xs font-bold">{item.name}</p>
                        <p className="truncate text-3xs text-muted">{item.editionLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-right text-3xs text-clay">(x {item.quantity})</td>
                  <td className="py-2 text-right text-xs font-bold text-accent">
                    {formatEthWithUnit(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-3xs">
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEthWithUnit(data.totals.networkFee, 4)}</dd>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <dt>Total</dt>
              <dd className="text-accent">{formatEthWithUnit(data.totals.total, 4)}</dd>
            </div>
          </dl>

          <p className="mt-6 text-center text-3xs text-muted">
            {data.status === 'confirmed'
              ? `Transação confirmada na ${NETWORK_LABELS[data.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.`
              : data.status === 'pending'
                ? `Transação enviada para a ${NETWORK_LABELS[data.network]}. O recibo é atualizado assim que a rede responder.`
                : 'Nenhum valor foi cobrado e os itens seguem disponíveis no seu carrinho.'}
          </p>

          <div className="mt-5 flex justify-center gap-3">
            {data.explorerUrl ? (
              <a
                href={data.explorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-sm bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground"
              >
                Ver no explorador
              </a>
            ) : null}
            <Link
              to="/mercado"
              search={{}}
              className={cn(
                'rounded-sm border border-primary px-6 py-2.5 text-xs font-bold text-accent',
                !data.explorerUrl && 'bg-primary text-primary-foreground',
              )}
            >
              Continuar explorando
            </Link>
          </div>

          <p className="mt-4 text-center text-3xs text-clay">
            Referência {data.reference} · link do explorador simulado
          </p>
        </div>

        <div aria-hidden className="h-1.5 bg-primary" />
      </div>
    </section>
  )
}
