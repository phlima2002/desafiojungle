import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { formatEthWithUnit } from '@/shared/lib/money'
import { Breadcrumb } from '@/features/shell/breadcrumb'
import { useNftSubscription } from '@/features/realtime/realtime-provider'
import { useCatalogQuery } from '@/features/catalog/use-catalog'
import { NftCard } from '@/features/catalog/nft-card'
import { PAGE_SIZE } from '@/features/catalog/search-params'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QuantityStepper } from './quantity-stepper'
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
  const totals = cart.data?.totals

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }, { label: 'Carrinho' }]}
      />

      <h1 className="sr-only">Carrinho de NFTs</h1>

      {cart.isPending ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" aria-hidden>
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-20 w-full rounded-md" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-md" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-md border border-line bg-card p-10 text-center">
          <p className="text-base font-bold">Seu carrinho está vazio</p>
          <p className="mt-2 text-xs text-muted">Explore o catálogo e adicione edições para continuar.</p>
          <Button asChild size="sm" className="mt-6">
            <Link to="/mercado" search={{}}>
              Explorar catálogo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-label="Itens do carrinho" className="min-w-0 space-y-3">
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

            {/* Cinco colunas não cabem em 390 px. Abaixo de `sm` as colunas de
                preço e total saem da tabela e reaparecem sob o nome do item —
                nenhum dado é perdido e nada transborda. */}
            <Table>
              <TableCaption>Itens no carrinho, com preço, quantidade e total</TableCaption>
              <TableHeader>
                <TableRow className="border-line">
                  {/* Absorve a sobra: as outras colunas ficam no tamanho
                        natural e o nome trunca, em vez de empurrar a tabela. */}
                  <TableHead scope="col" className="w-full">
                    NFTs
                  </TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">
                    Preço
                  </TableHead>
                  <TableHead scope="col">Edições</TableHead>
                  <TableHead scope="col" className="hidden sm:table-cell">
                    Total
                  </TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Remover</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="bg-card">
                    <TableCell className="w-full max-w-0">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt}
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          className="size-12 shrink-0 rounded-sm object-cover"
                        />
                        <div className="min-w-0">
                          <Link
                            to="/nft/$slug"
                            params={{ slug: item.nftSlug }}
                            className="block truncate text-xs font-bold hover:text-accent"
                          >
                            {item.name}
                          </Link>
                          <p className="truncate text-3xs text-muted">{item.editionLabel}</p>
                          <p className="mt-1 text-3xs font-bold text-accent sm:hidden">
                            {formatEthWithUnit(item.unitPrice)}
                            {item.quantity > 1 ? (
                              <span className="font-normal text-muted">
                                {' '}
                                · total {formatEthWithUnit(item.lineTotal)}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-xs font-bold text-accent sm:table-cell">
                      {formatEthWithUnit(item.unitPrice)}
                    </TableCell>

                    <TableCell>
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.max(1, Math.min(item.available, item.maxPerOrder))}
                        label={item.name}
                        onChange={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
                      />
                    </TableCell>

                    <TableCell className="hidden text-xs font-bold text-accent sm:table-cell">
                      {formatEthWithUnit(item.lineTotal)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem.mutate(item.id)}
                        aria-label={`Remover ${item.name} do carrinho`}
                        className="text-sand hover:text-danger"
                      >
                        <Trash2 aria-hidden size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <aside aria-label="Resumo da carteira" className="h-fit rounded-md border border-line bg-card p-5">
            <h2 className="text-lg font-bold">Resumo da carteira</h2>

            <form
              className="mt-5 space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                applyCoupon.mutate(code)
              }}
            >
              <Label htmlFor="cupom" className="text-xs font-bold">
                Código promocional
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cupom"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-invalid={applyCoupon.isError}
                  aria-describedby={applyCoupon.isError ? 'cupom-erro' : undefined}
                  placeholder="Digite o código promocional..."
                  className="flex-1 bg-card-raised py-2 text-3xs"
                />
                <Button type="submit" size="sm" disabled={applyCoupon.isPending}>
                  Aplicar
                </Button>
              </div>
              {applyCoupon.isError ? (
                <p id="cupom-erro" role="alert" className="text-3xs text-danger">
                  {applyCoupon.error.message}
                </p>
              ) : null}
            </form>

            {cart.data?.coupon ? (
              <p className="mt-3 flex items-center justify-between text-3xs">
                <span className="text-success">{cart.data.coupon.code} aplicado</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => removeCoupon.mutate()}
                  aria-label={`Remover o cupom ${cart.data.coupon.code}`}
                  className="h-auto p-0 text-3xs font-normal text-sand"
                >
                  remover
                </Button>
              </p>
            ) : null}

            <dl className="mt-6 space-y-3 text-xs">
              <div className="flex items-baseline justify-between">
                <dt>Subtotal</dt>
                <dd>{formatEthWithUnit(totals!.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt>Desconto do lançamento</dt>
                <dd className="text-success">(−) {formatEthWithUnit(totals!.discount)}</dd>
              </div>
              {/* A nota da taxa mora dentro do `<dd>` a que se refere: um
                  `<p>` solto dentro de `<dl>` é markup inválido, e o axe
                  reprova (regra `definition-list`). */}
              <div className="flex flex-wrap items-baseline justify-between">
                <dt>Taxa de rede</dt>
                <dd className="text-right">
                  {formatEthWithUnit(totals!.networkFee, 4)}
                  <span className="block text-3xs text-clay">Taxa estimada</span>
                </dd>
              </div>

              <div className="flex items-baseline justify-between border-t border-line pt-4 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-accent">{formatEthWithUnit(totals!.total, 4)}</dd>
              </div>
            </dl>

            <Button asChild size="sm" className="mt-5 w-full">
              <Link to="/pagamento">Conectar e finalizar</Link>
            </Button>
            <Button asChild variant="link" size="sm" className="mt-3 w-full text-3xs font-normal">
              <Link to="/mercado" search={{}}>
                Continuar explorando
              </Link>
            </Button>
          </aside>
        </div>
      )}

      <RelatedNfts />
    </div>
  )
}

function RelatedNfts() {
  const related = useCatalogQuery({
    tab: 'trending',
    sort: 'trending',
    page: 1,
    pageSize: PAGE_SIZE,
  })

  const items = (related.data?.items ?? []).slice(0, 5)
  if (items.length === 0) return null

  return (
    <section aria-labelledby="tambem-viram" className="mt-16 border-t border-line pt-8">
      <h2 id="tambem-viram" className="text-md font-bold text-accent">
        Colecionadores também viram
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} canFavorite={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
