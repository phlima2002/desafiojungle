import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import { RARITY_LABELS, type NftSummary } from '@/shared/api/contracts'
import { formatEthWithUnit } from '@/shared/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface NftCardProps {
  nft: NftSummary
  canFavorite: boolean
  onToggleFavorite?: (nft: NftSummary) => void
  onQuickAdd?: (nft: NftSummary) => void
}

export function NftCard({ nft, canFavorite, onToggleFavorite, onQuickAdd }: NftCardProps) {
  const soldOut = nft.available === 0
  const actionClass =
    'bg-ink-950/80 text-cream hover:bg-primary hover:text-primary-foreground hover:opacity-100'

  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-md bg-card-raised">
        <img
          src={nft.imageUrl}
          alt={nft.imageAlt}
          width={368}
          height={368}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />

        {nft.rarity !== 'comum' ? (
          <Badge className="absolute top-3 right-0 rounded-l-xs rounded-r-none px-2 py-1 text-3xs tracking-wide">
            {RARITY_LABELS[nft.rarity]}
          </Badge>
        ) : null}

        {soldOut ? (
          <Badge
            variant="danger"
            className="absolute top-3 left-3 bg-ink-950/85 px-2 py-1 text-micro tracking-wide"
          >
            Esgotado
          </Badge>
        ) : null}

        {/* Quick actions: revealed on hover, but always reachable by keyboard. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center gap-2 p-3 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 motion-reduce:transition-none max-md:pointer-events-auto max-md:opacity-100">
          {onQuickAdd ? (
            <Button
              type="button"
              size="pill"
              className={actionClass}
              disabled={soldOut}
              onClick={() => onQuickAdd(nft)}
              aria-label={soldOut ? `${nft.name} está esgotado` : `Adicionar ${nft.name} ao carrinho`}
            >
              <ShoppingCart aria-hidden size={15} />
            </Button>
          ) : null}

          {canFavorite && onToggleFavorite ? (
            <Button
              type="button"
              size="pill"
              className={actionClass}
              onClick={() => onToggleFavorite(nft)}
              aria-pressed={nft.favorited}
              aria-label={nft.favorited ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            >
              <Heart aria-hidden size={15} className={cn(nft.favorited && 'fill-danger text-danger')} />
            </Button>
          ) : null}

          <Button asChild size="pill" className={actionClass}>
            <Link to="/nft/$slug" params={{ slug: nft.slug }} aria-label={`Ver detalhes de ${nft.name}`}>
              <Search aria-hidden size={15} />
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-base">
          <Link
            to="/nft/$slug"
            params={{ slug: nft.slug }}
            className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex items-baseline gap-2">
          <span className="text-base font-bold text-accent">{formatEthWithUnit(nft.price)}</span>
          {nft.compareAtPrice ? (
            <span className="text-lg text-clay line-through">{formatEthWithUnit(nft.compareAtPrice)}</span>
          ) : null}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="skeleton aspect-square w-full rounded-md" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-4 w-1/3" />
    </div>
  )
}
