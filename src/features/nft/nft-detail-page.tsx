import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Heart, Star } from 'lucide-react'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { NETWORK_LABELS } from '@/features/catalog/labels'
import { Breadcrumb } from '@/features/shell/breadcrumb'
import { MobileBackButton } from '@/features/shell/mobile-screen-header'
import { QuantityStepper } from '@/features/cart/quantity-stepper'
import { useSession } from '@/features/session/use-session'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { useAddToCart } from '@/features/cart/use-cart'
import { useNftSubscription } from '@/features/realtime/realtime-provider'
import { useCatalogQuery, useNftDetailQuery } from '@/features/catalog/use-catalog'
import { NftCard } from '@/features/catalog/nft-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NftDetailSkeleton } from './nft-detail-skeleton'
import { ShareButton } from './share-button'

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

  if (detail.isPending) return <NftDetailSkeleton slug={slug} />
  if (!nft) return null

  const selected = nft.editions.find((edition) => edition.id === editionId) ?? nft.editions[0]!
  const ceiling = Math.max(1, Math.min(selected.available, selected.maxPerOrder))
  const soldOut = selected.available === 0
  const gallery = nft.gallery

  return (
    /* No celular o Figma abre a tela pela arte, sangrando de borda a borda, com
       voltar e favoritar flutuando sobre ela — por isso o `article` não tem
       respiro lateral abaixo de `md` e cada bloco cuida do próprio. */
    <article className="mx-auto max-w-page pb-8 md:px-4 md:py-8 lg:px-8">
      <div className="hidden md:block">
        <Breadcrumb
          items={[
            { label: 'Início', to: '/' },
            { label: 'Mercado', to: '/mercado' },
          ]}
        />
      </div>

      <div className="grid gap-6 md:mt-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative flex flex-col-reverse gap-4 md:flex-row">
          <MobileBackButton className="absolute top-4 left-4 z-10 bg-ink-950/70 md:hidden" />
          <ShareButton
            name={nft.name}
            className="absolute top-4 right-4 z-10 size-11 rounded-pill bg-ink-950/70 text-cream md:hidden"
          />
          {session ? (
            <Button
              type="button"
              size="icon"
              aria-pressed={nft.favorited}
              onClick={() => toggleFavorite.mutate({ nftId: nft.id, favorited: !nft.favorited })}
              aria-label={nft.favorited ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
              className="absolute top-4 right-16 z-10 size-11 rounded-pill bg-ink-950/70 text-cream md:hidden"
            >
              <Heart aria-hidden size={18} className={cn(nft.favorited && 'fill-danger text-danger')} />
            </Button>
          ) : null}

          <ul className="flex shrink-0 gap-3 px-4 md:flex-col md:px-0">
            {gallery.map((image, index) => (
              <li key={`${image.url}#${image.alt}`}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Ver imagem ${index + 1} de ${gallery.length}`}
                  aria-current={index === activeImage}
                  className={cn(
                    'size-16 overflow-hidden rounded-sm border-2 p-0',
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
                </Button>
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
            className="aspect-square min-w-0 flex-1 rounded-b-3xl object-cover md:rounded-md md:border md:border-line"
          />
        </div>

        <div className="mx-4 min-w-0 space-y-4 rounded-3xl bg-card p-5 md:mx-0 md:rounded-none md:bg-transparent md:p-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-h3 font-bold md:text-h1">{nft.name}</h1>

            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <ShareButton name={nft.name} />
              {/* Favoritar exige sessão — quem não entrou vê o botão e é levado
                  ao login, em vez de o controle simplesmente não existir. */}
              {session ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-pressed={nft.favorited}
                  aria-label={nft.favorited ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
                  onClick={() => toggleFavorite.mutate({ nftId: nft.id, favorited: !nft.favorited })}
                  className="bg-transparent text-sand hover:border-primary hover:text-accent"
                >
                  <Heart aria-hidden size={16} className={cn(nft.favorited && 'fill-danger text-danger')} />
                </Button>
              ) : (
                <Button
                  asChild
                  variant="secondary"
                  size="icon"
                  className="bg-transparent text-sand hover:border-primary hover:text-accent"
                >
                  <Link
                    to="/entrar"
                    search={{ redirect: `/nft/${nft.slug}` }}
                    aria-label="Entrar para favoritar"
                  >
                    <Heart aria-hidden size={16} />
                  </Link>
                </Button>
              )}
            </div>
            {/* O selo de nota do Figma: a mesma informação das estrelas, no
                formato compacto que cabe ao lado do nome no celular. */}
            <p className="flex shrink-0 items-center gap-1 rounded-pill border border-primary px-3 py-1 text-3xs text-accent md:hidden">
              <Star aria-hidden size={12} className="fill-amber-300 text-amber-300" />
              <span>
                <span className="sr-only">Avaliação </span>
                {nft.rating}
                <span className="text-muted">({nft.reviewCount})</span>
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-4">
            <p className="text-h4 font-bold text-accent">{formatEthWithUnit(selected.price)}</p>
            {nft.compareAtPrice ? (
              <p className="text-lg text-clay line-through">{formatEthWithUnit(nft.compareAtPrice)}</p>
            ) : null}

            <p className="hidden items-center gap-1 text-3xs text-muted md:flex">
              <span className="flex" aria-hidden>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={12}
                    className={cn(
                      star <= Math.round(nft.rating) ? 'fill-amber-300 text-amber-300' : 'text-clay',
                    )}
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
                  <Button
                    key={edition.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={unavailable}
                    aria-pressed={active}
                    onClick={() => {
                      setEditionId(edition.id)
                      setQuantity(1)
                    }}
                    className={cn(
                      'h-auto rounded-pill border px-3 py-1 text-3xs font-normal',
                      active
                        ? 'border-primary text-accent'
                        : 'border-transparent text-sand hover:text-accent',
                      unavailable && 'cursor-not-allowed text-clay line-through',
                    )}
                  >
                    {edition.label}
                    <span className="sr-only">
                      {unavailable ? ' — esgotada' : ` — ${edition.available} disponíveis`}
                    </span>
                  </Button>
                )
              })}
              <span className="rounded-pill px-3 py-1 text-3xs text-clay">
                {soldOut ? 'ESGOTADA' : 'ABERTA'}
              </span>
            </div>
          </fieldset>

          {/* No celular a ação de compra fecha a tela: quantidade e preço numa
              linha, botão largo embaixo — o favoritar já está flutuando sobre a
              arte, então o botão de texto some. */}
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
            <div className="flex items-center justify-between gap-4 md:contents">
              <QuantityStepper
                value={quantity}
                max={ceiling}
                label={nft.name}
                disabled={soldOut}
                onChange={setQuantity}
              />
              <p aria-hidden className="text-h4 font-bold text-accent md:hidden">
                {formatEthWithUnit(selected.price)}
              </p>
            </div>

            <Button
              type="button"
              disabled={soldOut || addToCart.isPending}
              onClick={() => addToCart.mutate({ nftId: nft.id, editionId: selected.id, quantity })}
              className="h-auto rounded-pill px-8 py-3 text-3xs tracking-wide max-md:w-full md:rounded-sm md:py-2.5"
            >
              {soldOut ? 'Esgotado' : addToCart.isPending ? 'Adicionando…' : 'Comprar'}
            </Button>

            {session ? (
              <Button
                type="button"
                variant="secondary"
                aria-pressed={nft.favorited}
                onClick={() => toggleFavorite.mutate({ nftId: nft.id, favorited: !nft.favorited })}
                className="hidden h-auto bg-transparent px-5 py-2.5 text-3xs font-normal text-sand hover:border-primary hover:text-accent md:inline-flex"
              >
                <Heart aria-hidden size={14} className={cn(nft.favorited && 'fill-danger text-danger')} />
                {nft.favorited ? 'Nos favoritos' : 'Favoritar'}
              </Button>
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
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList aria-label="Informações do NFT" className="gap-8 border-0">
            <TabsTrigger value="detalhes" className="pb-2 text-sm">
              Detalhes do NFT
            </TabsTrigger>
            <TabsTrigger value="avaliacoes" className="pb-2 text-sm">
              Avaliações de colecionadores ({nft.reviewCount})
            </TabsTrigger>
          </TabsList>

          {/* `forceMount` mantém os dois painéis no documento: o `aria-controls`
              de cada aba continua apontando para um elemento que existe, e o
              inativo some por CSS. */}
          <TabsContent
            value="detalhes"
            forceMount
            className="mt-6 space-y-4 text-xs text-muted data-[state=inactive]:hidden"
          >
            <>
              <p>{nft.description}</p>
              <p>
                A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um
                registro permanente de procedência na rede. {nft.creator.name} recebe{' '}
                {nft.royaltiesBasisPoints / 100}% de direitos autorais nas vendas secundárias.
              </p>
              <dl className="space-y-2">
                <dt className="text-sm font-bold text-foreground">Rede:</dt>
                <dd>
                  Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados em IPFS.
                </dd>
                <dt className="text-sm font-bold text-foreground">Contrato:</dt>
                <dd className="break-all">
                  {nft.contractAddress} · Contrato inteligente ERC-721 verificado.
                </dd>
                <dt className="text-sm font-bold text-foreground">Direitos autorais:</dt>
                <dd>
                  {nft.royaltiesBasisPoints / 100}% nas vendas secundárias, pagos automaticamente pelos
                  mercados compatíveis.
                </dd>
              </dl>
            </>
          </TabsContent>

          <TabsContent
            value="avaliacoes"
            forceMount
            className="mt-6 space-y-4 text-xs text-muted data-[state=inactive]:hidden"
          >
            <p>
              As {nft.reviewCount} avaliações desta obra não fazem parte do escopo do desafio — nenhuma
              resenha simulada é exibida aqui.
            </p>
          </TabsContent>
        </Tabs>
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
