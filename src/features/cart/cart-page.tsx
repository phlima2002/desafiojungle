import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { formatEthWithUnit } from '@/shared/lib/money'
import { useNftSubscription } from '@/features/realtime/realtime-provider'
import {
  useApplyCoupon,
  useCartQuery,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from './use-cart'

export function CartPage() {
  const cart = useCartQuery()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [code, setCode] = useState('')

  const items = cart.data?.items ?? []
  useNftSubscription(items.map((item) => item.nftId))

  const changed = items.filter((item) => item.priceChangedFrom || item.unavailable)

  return (
    <section className="mx-auto max-w-page px-4 py-10 sm:px-8">
      <h1 className="text-h1 font-bold">Carrinho de NFTs</h1>

      {cart.isPending ? (
        <ul className="mt-8 space-y-4" aria-hidden>
          {[0, 1, 2].map((index) => (
            <li key={index} className="skeleton h-28 w-full rounded-md" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-md border border-line bg-card p-10 text-center">
          <p className="text-base font-bold">Seu carrinho está vazio</p>
          <Link
            to="/mercado"
            search={{}}
            className="mt-4 inline-block rounded-sm bg-primary px-5 py-3 text-xs font-bold text-primary-foreground uppercase"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {changed.length > 0 ? (
              <div role="status" className="rounded-md border border-danger/40 bg-danger/10 p-4 text-xs">
                <p className="font-bold text-danger">Algo mudou enquanto seu carrinho estava aberto</p>
                <ul className="mt-2 space-y-1 text-muted">
                  {changed.map((item) => (
                    <li key={item.id}>
                      {item.unavailable
                        ? `"${item.name}" não tem mais a quantidade escolhida (${item.available} disponíveis).`
                        : `"${item.name}" mudou de ${formatEthWithUnit(item.priceChangedFrom!)} para ${formatEthWithUnit(item.unitPrice)}.`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-card p-4"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className="size-20 rounded-sm object-cover"
                  />
                  <div className="min-w-40 flex-1">
                    <p className="text-base font-bold">{item.name}</p>
                    <p className="text-3xs text-muted">{item.editionLabel}</p>
                    <p className="text-xs text-accent">{formatEthWithUnit(item.unitPrice)}</p>
                  </div>

                  <label className="flex items-center gap-2 text-3xs">
                    <span className="sr-only">Quantidade de {item.name}</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.min(item.available, item.maxPerOrder)}
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem.mutate({ itemId: item.id, quantity: Number(event.target.value) || 1 })
                      }
                      className="w-16 rounded-sm border border-line bg-card-raised px-2 py-1 text-xs"
                    />
                  </label>

                  <p className="w-24 text-right text-xs font-bold">{formatEthWithUnit(item.lineTotal)}</p>

                  <button
                    type="button"
                    onClick={() => removeItem.mutate(item.id)}
                    aria-label={`Remover ${item.name} do carrinho`}
                    className="rounded-sm p-2 text-sand transition-colors hover:text-danger"
                  >
                    <Trash2 aria-hidden size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="h-fit space-y-4 rounded-md border border-line bg-card p-6">
            <h2 className="text-lg font-bold">Resumo</h2>

            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                applyCoupon.mutate(code)
              }}
            >
              <label htmlFor="cupom" className="text-xs font-bold">
                Código promocional
              </label>
              <div className="flex gap-2">
                <input
                  id="cupom"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-invalid={applyCoupon.isError}
                  aria-describedby={applyCoupon.isError ? 'cupom-erro' : undefined}
                  className="w-full rounded-sm border border-line bg-card-raised px-3 py-2 text-xs"
                  placeholder="KURIO10"
                />
                <button
                  type="submit"
                  disabled={applyCoupon.isPending}
                  className="rounded-sm bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
              {applyCoupon.isError ? (
                <p id="cupom-erro" role="alert" className="text-3xs text-danger">
                  {applyCoupon.error.message}
                </p>
              ) : null}
            </form>

            {cart.data?.coupon ? (
              <p className="flex items-center justify-between text-xs">
                <span className="text-success">{cart.data.coupon.code} aplicado</span>
                <button
                  type="button"
                  onClick={() => removeCoupon.mutate()}
                  aria-label={`Remover o cupom ${cart.data.coupon.code}`}
                  className="text-3xs text-sand underline underline-offset-4"
                >
                  remover
                </button>
              </p>
            ) : null}

            <dl className="space-y-2 border-t border-line pt-4 text-xs">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatEthWithUnit(cart.data!.totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Desconto</dt>
                <dd className="text-success">−{formatEthWithUnit(cart.data!.totals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Taxa de rede</dt>
                <dd>{formatEthWithUnit(cart.data!.totals.networkFee, 4)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-accent">{formatEthWithUnit(cart.data!.totals.total, 4)}</dd>
              </div>
            </dl>

            <Link
              to="/pagamento"
              className="block rounded-sm bg-primary px-5 py-3 text-center text-xs font-bold text-primary-foreground uppercase"
            >
              Finalizar compra
            </Link>
          </aside>
        </div>
      )}
    </section>
  )
}
