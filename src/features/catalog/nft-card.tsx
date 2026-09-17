import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { NftSummary } from '@/shared/api/contracts'
import { formatEthWithUnit } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'

interface NftCardProps {
  nft: NftSummary
  onToggleFavorite?: (nft: NftSummary) => void
  canFavorite: boolean
}

export function NftCard({ nft, onToggleFavorite, canFavorite }: NftCardProps) {
  const soldOut = nft.available === 0

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
        {soldOut ? (
          <p className="absolute top-3 left-3 rounded-xs bg-ink-950/85 px-2 py-1 text-micro font-bold tracking-wide text-danger uppercase">
            Esgotado
          </p>
        ) : null}
        {canFavorite && onToggleFavorite ? (
          <button
            type="button"
            onClick={() => onToggleFavorite(nft)}
            aria-pressed={nft.favorited}
            aria-label={nft.favorited ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-pill bg-ink-950/70 text-cream transition-colors hover:bg-ink-950"
          >
            <Heart aria-hidden size={16} className={cn(nft.favorited && 'fill-danger text-danger')} />
          </button>
        ) : null}
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
