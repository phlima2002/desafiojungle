import { useState } from 'react'
import { Heart, Star } from 'lucide-react'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { Breadcrumb } from '@/features/shell/breadcrumb'
import { QuantityStepper } from '@/features/cart/quantity-stepper'
import { useSession } from '@/features/session/use-session'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { useAddToCart } from '@/features/cart/use-cart'
import { useNftSubscription } from '@/features/realtime/realtime-provider'
import { useCatalogQuery, useNftDetailQuery } from '@/features/catalog/use-catalog'
import { NftCard } from '@/features/catalog/nft-card'
import { NftDetailSkeleton } from './nft-detail-skeleton'

type Tab = 'detalhes' | 'avaliacoes'

export function NftDetailPage({ slug }: { slug: string }) {
  const { session } = useSession()
  const detail = useNftDetailQuery(slug)
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()

  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [tab, setTab] = useState<Tab>('detalhes')

  const nft = detail.data
  useNftSubscription(nft ? [nft.id] : [])

  if (detail.isPending) return <NftDetailSkeleton />
  if (!nft) return null

  const selected = nft.editions.find((edition) => edition.id === editionId) ?? nft.editions[0]!
  const ceiling = Math.max(1, Math.min(selected.available, selected.maxPerOrder))
  const soldOut = selected.available === 0
  const gallery = nft.gallery

  return (
    <article className="mx-auto max-w-page px-4 py-8 sm:px-8">
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex gap-4">
          <ul className="flex shrink-0 flex-col gap-3">
            {gallery.map((image, index) => (
              <li key={`${image.url}#${image.alt}`}>
                <button
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Ver imagem ${index + 1} de ${gallery.length}`}
                  aria-current={index === activeImage}
                  className={cn(
                    'block overflow-hidden rounded-sm border-2 transition-colors',
                    index === activeImage ? 'border-primary' : 'border-transparent hover:border-line',
                  )}
                >
                  <img
                    src={image.url}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="size-16 object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>

          <img
            src={gallery[activeImage]!.url}
            alt={gallery[activeImage]!.alt}
            width={600}
            height={600}
            fetchPriority="high"
            decoding="async"
            className="aspect-square min-w-0 flex-1 rounded-md border border-line object-cover"
          />
        </div>

        <div className="min-w-0 space-y-4">
          <h1 className="text-h1 font-bold">{nft.name}</h1>

          <div className="flex flex-wrap items-baseline gap-4">
            <p className="text-h4 font-bold text-accent">{formatEthWithUnit(selected.price)}</p>
            {nft.compareAtPrice ? (
              <p className="text-lg text-clay line-through">{formatEthWithUnit(nft.compareAtPrice)}</p>
            ) : null}

            <p className="flex items-center gap-1 text-3xs text-muted">
              <span className="flex" aria-hidden>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={12}
                    className={cn(star <= Math.round(nft.rating) ? 'fill-amber-300 text-amber-300' : 'text-clay')}
                  />
                ))}
              </span>
              <span>
                <span className="sr-only">Avaliação {nft.rating} de 5. </span>
                {nft.reviewCount} avaliações de colecionadores
              </span>
            </p>
          </div>

          <section>
            <h2 className="text-sm font-bold">Sobre este NFT:</h2>
            <p className="mt-1 text-xs text-muted">{nft.description}</p>
          </section>

          <fieldset>
            <legend className="text-sm font-bold">Edição:</legend>
            <div className="mt-2 flex flex-wrap gap-2">
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
                      'rounded-pill border px-3 py-1 text-3xs transition-colors',
                      active ? 'border-primary text-accent' : 'border-transparent text-sand hover:text-accent',
                      unavailable && 'cursor-not-allowed text-clay line-through',
                    )}
                  >
                    {edition.label}
                    <span className="sr-only">
                      {unavailable ? ' — esgotada' : ` — ${edition.available} disponíveis`}
                    </span>
                  </button>
                )
              })}
              <span className="rounded-pill px-3 py-1 text-3xs text-clay">
                {soldOut ? 'ESGOTADA' : 'ABERTA'}
              </span>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <QuantityStepper
              value={quantity}
              max={ceiling}
              label={nft.name}
              disabled={soldOut}
              onChange={setQuantity}
            />

            <button
              type="button"
              disabled={soldOut || addToCart.isPending}
              onClick={() => addToCart.mutate({ nftId: nft.id, editionId: selected.id, quantity })}
              className="rounded-sm bg-primary px-8 py-2.5 text-3xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'Comprar'}
            </button>

            {session ? (
              <button
                type="button"
                aria-pressed={nft.favorited}
                onClick={() => toggleFavorite.mutate({ nftId: nft.id, favorited: !nft.favorited })}
                className="flex items-center gap-2 rounded-sm border border-line px-5 py-2.5 text-3xs text-sand transition-colors hover:border-primary hover:text-accent"
              >
                <Heart aria-hidden size={14} className={cn(nft.favorited && 'fill-danger text-danger')} />
                {nft.favorited ? 'Nos favoritos' : 'Favoritar'}
              </button>
            ) : null}
          </div>

          {addToCart.isError ? (
            <p role="alert" className="text-3xs text-danger">
              {addToCart.error.message}
            </p>
          ) : null}
          {addToCart.isSuccess ? (
            <p role="status" className="text-3xs text-success">
              Adicionado ao carrinho.
            </p>
          ) : null}

          <dl className="space-y-1 text-3xs text-muted">
            <div className="flex gap-2">
              <dt className="text-foreground">ID do token:</dt>
              <dd>#{nft.tokenId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground">Coleção:</dt>
              <dd>{nft.collectionName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground">Atributos:</dt>
              <dd>{nft.attributes.map((attribute) => attribute.value).join(', ')}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-12 border-t border-line pt-6">
        <div role="tablist" aria-label="Informações do NFT" className="flex gap-8">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'detalhes'}
            onClick={() => setTab('detalhes')}
            className={cn(
              'border-b-2 pb-2 text-sm transition-colors',
              tab === 'detalhes' ? 'border-primary font-bold text-accent' : 'border-transparent text-sand',
            )}
          >
            Detalhes do NFT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'avaliacoes'}
            onClick={() => setTab('avaliacoes')}
            className={cn(
              'border-b-2 pb-2 text-sm transition-colors',
              tab === 'avaliacoes' ? 'border-primary font-bold text-accent' : 'border-transparent text-sand',
            )}
          >
            Avaliações de colecionadores ({nft.reviewCount})
          </button>
        </div>

        <div className="mt-6 space-y-4 text-xs text-muted">
          {tab === 'detalhes' ? (
            <>
              <p>{nft.description}</p>
              <p>
                A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e
                um registro permanente de procedência na rede. {nft.creator.name} recebe{' '}
                {nft.royaltiesBasisPoints / 100}% de direitos autorais nas vendas secundárias.
              </p>
              <dl className="space-y-2">
                <dt className="text-sm font-bold text-foreground">Rede:</dt>
                <dd>Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados em IPFS.</dd>
                <dt className="text-sm font-bold text-foreground">Contrato:</dt>
                <dd className="break-all">{nft.contractAddress} · Contrato inteligente ERC-721 verificado.</dd>
                <dt className="text-sm font-bold text-foreground">Direitos autorais:</dt>
                <dd>
                  {nft.royaltiesBasisPoints / 100}% nas vendas secundárias, pagos automaticamente pelos
                  mercados compatíveis.
                </dd>
              </dl>
            </>
          ) : (
            <p>
              As {nft.reviewCount} avaliações desta obra não fazem parte do escopo do desafio — nenhuma
              resenha simulada é exibida aqui.
            </p>
          )}
        </div>
      </section>

      <MoreFromCollection collectionId={nft.collectionId} currentId={nft.id} />
    </article>
  )
}

function MoreFromCollection({ collectionId, currentId }: { collectionId: string; currentId: string }) {
  const related = useCatalogQuery({ tab: 'all', sort: 'trending', page: 1, pageSize: 12 })
  const items = (related.data?.items ?? [])
    .filter((nft) => nft.collectionId === collectionId && nft.id !== currentId)
    .slice(0, 5)

  if (items.length === 0) return null

  return (
    <section aria-labelledby="mais-colecao" className="mt-14">
      <h2 id="mais-colecao" className="text-md font-bold text-accent">
        Mais desta coleção
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
