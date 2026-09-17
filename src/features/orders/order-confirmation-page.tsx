import { useQuery } from '@tanstack/react-query'
import { checkoutApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import { formatEthWithUnit } from '@/shared/lib/money'
import { useSession } from '@/features/session/use-session'

const STATUS_LABEL = {
  pending: 'Pedido pendente',
  confirmed: 'Pedido confirmado',
  declined: 'Pedido recusado',
} as const

export function OrderConfirmationPage({ orderId }: { orderId: string }) {
  const { scope } = useSession()
  const order = useQuery({
    queryKey: queryKeys.order(scope, orderId),
    queryFn: ({ signal }) => checkoutApi.getOrder(orderId, signal),
    ...cachePolicy.order,
    // A pending order is polled until it reaches a terminal state, so the page
    // recovers even if the realtime event was missed.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2_000 : false),
  })

  if (order.isPending) return <div className="skeleton mx-auto my-16 h-64 max-w-2xl rounded-md" aria-hidden />
  if (order.isError) {
    return (
      <p role="alert" className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-danger">
        {order.error.message}
      </p>
    )
  }

  const data = order.data

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-h1 font-bold">{STATUS_LABEL[data.status]}</h1>
      <p className="mt-2 text-xs text-muted">Referência {data.reference}</p>

      {data.status === 'pending' ? (
        <p role="status" className="mt-4 text-xs text-muted">
          Aguardando a confirmação da transação. Você pode recarregar a página com segurança.
        </p>
      ) : null}
      {data.status === 'declined' && data.declineReason ? (
        <p role="alert" className="mt-4 text-xs text-danger">
          {data.declineReason}
        </p>
      ) : null}
      {data.transactionHash ? (
        <p className="mt-4 truncate text-xs">
          <span className="font-bold">ID da transação: </span>
          <span className="text-muted">{data.transactionHash}</span>
        </p>
      ) : null}

      <ul className="mt-8 space-y-3">
        {data.items.map((item) => (
          <li
            key={`${item.nftId}-${item.editionId}`}
            className="flex items-center gap-4 rounded-md bg-card p-4"
          >
            <img
              src={item.imageUrl}
              alt={item.imageAlt}
              width={56}
              height={56}
              className="size-14 rounded-sm object-cover"
            />
            <div className="flex-1">
              <p className="text-xs font-bold">{item.name}</p>
              <p className="text-3xs text-muted">
                {item.editionLabel} · {item.quantity}×
              </p>
            </div>
            <p className="text-xs">{formatEthWithUnit(item.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-2 border-t border-line pt-4 text-xs">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatEthWithUnit(data.totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Taxa de rede</dt>
          <dd>{formatEthWithUnit(data.totals.networkFee, 4)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-accent">{formatEthWithUnit(data.totals.total, 4)}</dd>
        </div>
      </dl>
    </section>
  )
}
