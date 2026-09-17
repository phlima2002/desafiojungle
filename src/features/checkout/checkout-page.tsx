import { Link } from '@tanstack/react-router'
import { useCartQuery } from '@/features/cart/use-cart'
import { formatEthWithUnit } from '@/shared/lib/money'

/**
 * Placeholder for the payment flow. The contracts, quote endpoint and
 * idempotent order mutation it will use already exist — see
 * `shared/api/endpoints/checkout.ts` and the `price-changed`, `order-timeout`
 * and `payment-declined` mock scenarios.
 */
export function CheckoutPage() {
  const cart = useCartQuery()

  return (
    <section className="mx-auto max-w-page px-4 py-10 sm:px-8">
      <h1 className="text-h1 font-bold">Pagamento</h1>
      <p className="mt-2 text-xs text-muted">
        Dados do colecionador, seleção de carteira e rede, revisão e envio do pedido.
      </p>

      <div className="mt-8 rounded-md border border-line bg-card p-6">
        <p className="text-sm font-bold">Resumo do pedido</p>
        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <dt>Itens</dt>
            <dd>{cart.data?.totals.itemCount ?? 0}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd className="text-accent">{formatEthWithUnit(cart.data?.totals.total ?? '0', 4)}</dd>
          </div>
        </dl>
        <Link to="/carrinho" className="mt-6 inline-block text-xs text-accent underline underline-offset-4">
          Voltar ao carrinho
        </Link>
      </div>
    </section>
  )
}
