import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { useSession } from '@/features/session/use-session'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { useAddToCart } from '@/features/cart/use-cart'
import { useNftSubscription } from '@/features/realtime/realtime-provider'
import { useNftDetailQuery } from '@/features/catalog/use-catalog'
import { NftDetailSkeleton } from './nft-detail-skeleton'

export function NftDetailPage({ slug }: { slug: string }) {
  const { session } = useSession()
  const detail = useNftDetailQuery(slug)
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()

  const nft = detail.data
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  useNftSubscription(nft ? [nft.id] : [])

  if (detail.isPending) return <NftDetailSkeleton />
  if (!nft) return null

  const selected = nft.editions.find((edition) => edition.id === editionId) ?? nft.editions[0]!
  const ceiling = Math.max(1, Math.min(selected.available, selected.maxPerOrder))
  const soldOut = selected.available === 0

  return (
    <article className="mx-auto max-w-page px-4 py-10 sm:px-8">
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm font-bold">
        <Link to="/" className="text-sand hover:text-accent">
          Início
        </Link>
        <span className="px-2 text-clay">/</span>
        <Link to="/mercado" search={{}} className="text-sand hover:text-accent">
          Mercado
        </Link>
        <span className="px-2 text-clay">/</span>
        <span className="text-accent">{nft.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <img
            src={nft.gallery[0]!.url}
            alt={nft.gallery[0]!.alt}
            width={600}
            height={600}
            fetchPriority="high"
            decoding="async"
            className="aspect-square w-full rounded-lg object-cover shadow-card"
          />
          <ul className="grid grid-cols-3 gap-3">
            {nft.gallery.map((image) => (
              <li key={image.url}>
                <img
                  src={image.url}
                  alt={image.alt}
                  width={180}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-sm object-cover"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <header className="space-y-2">
            <p className="text-sm text-sand">{nft.collectionName}</p>
            <h1 className="text-h1 font-bold">{nft.name}</h1>
            <p className="text-sm text-muted">
              por <span className="text-accent">{nft.creator.name}</span>
              {nft.creator.verified ? ' · criador verificado' : null}
            </p>
          </header>

          <p className="flex items-baseline gap-3">
            <span className="text-h3 font-bold text-accent">{formatEthWithUnit(selected.price)}</span>
            {nft.compareAtPrice ? (
              <span className="text-lg text-clay line-through">{formatEthWithUnit(nft.compareAtPrice)}</span>
            ) : null}
          </p>

          <p className="text-xs text-muted">{nft.description}</p>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold">Edição</legend>
            <div className="flex flex-wrap gap-3">
              {nft.editions.map((edition) => {
                const unavailable = edition.available === 0
                const active = edition.id === selected.id
                return (
                  <button
                    key={edition.id}
                    type="button"
                    disabled={unavailable}
                    aria-pressed={active}
                    onClick={() => {
                      setEditionId(edition.id)
                      setQuantity(1)
                    }}
                    className={cn(
                      'rounded-sm border px-4 py-2 text-xs transition-colors',
                      active ? 'border-primary bg-primary/10 text-accent' : 'border-line text-sand',
                      unavailable && 'cursor-not-allowed line-through opacity-50',
                    )}
                  >
                    {edition.label}
                    <span className="ml-2 text-clay">
                      {unavailable ? 'esgotada' : `${edition.available} disp.`}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span>Quantidade</span>
              <input
                type="number"
                min={1}
                max={ceiling}
                value={quantity}
                disabled={soldOut}
                onChange={(event) =>
                  setQuantity(Math.max(1, Math.min(ceiling, Number(event.target.value) || 1)))
                }
                className="w-20 rounded-sm border border-line bg-card px-3 py-2 text-base"
              />
            </label>
            <p className="text-3xs text-clay">Máximo de {ceiling} por pedido</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={soldOut || addToCart.isPending}
              onClick={() => addToCart.mutate({ nftId: nft.id, editionId: selected.id, quantity })}
              className="rounded-sm bg-primary px-6 py-3 text-xs font-bold text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {soldOut ? 'Edição esgotada' : addToCart.isPending ? 'Adicionando…' : 'Comprar'}
            </button>

            {session ? (
              <button
                type="button"
                aria-pressed={nft.favorited}
                onClick={() => toggleFavorite.mutate({ nftId: nft.id, favorited: !nft.favorited })}
                className="flex items-center gap-2 rounded-sm border border-line px-4 py-3 text-xs text-sand transition-colors hover:border-primary hover:text-accent"
              >
                <Heart aria-hidden size={16} className={cn(nft.favorited && 'fill-danger text-danger')} />
                {nft.favorited ? 'Nos favoritos' : 'Favoritar'}
              </button>
            ) : null}
          </div>

          {addToCart.isError ? (
            <p role="alert" className="text-xs text-danger">
              {addToCart.error.message}
            </p>
          ) : null}
          {addToCart.isSuccess ? (
            <p role="status" className="text-xs text-success">
              Adicionado ao carrinho.{' '}
              <Link to="/carrinho" className="underline underline-offset-4">
                Ver carrinho
              </Link>
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-6 text-xs">
            <dt className="font-bold">Rede:</dt>
            <dd className="text-muted">{nft.network}</dd>
            <dt className="font-bold">Contrato:</dt>
            <dd className="truncate text-muted">{nft.contractAddress}</dd>
            <dt className="font-bold">Token:</dt>
            <dd className="text-muted">#{nft.tokenId}</dd>
          </dl>
        </div>
      </div>
    </article>
  )
}
