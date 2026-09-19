import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/shared/api/contracts'
import { formatEthWithUnit } from '@/shared/lib/money'

/**
 * O bloco que fecha a barra lateral no layout: uma peça em destaque, logo
 * abaixo das facetas.
 *
 * Ela sai do próprio resultado do catálogo — a primeira peça com preço
 * promocional, ou a primeira da página quando não há promoção —, então segue os
 * filtros que a pessoa aplicou em vez de apontar para uma peça fixa que pode
 * nem estar à venda.
 */
export function FeaturedNft({ nft, className }: { nft: NftSummary; className?: string }) {
  const discounted = Boolean(nft.compareAtPrice)

  return (
    <aside aria-labelledby="destaque-titulo" className={className}>
      <div className="overflow-hidden rounded-md bg-card">
        <div className="space-y-1 p-5 pb-4">
          <p id="destaque-titulo" className="text-eyebrow font-bold tracking-[0.1em] text-accent uppercase">
            NFT em destaque
          </p>
          <p className="text-md font-bold">{discounted ? 'Oferta limitada' : 'Escolha da curadoria'}</p>
        </div>

        <Link to="/nft/$slug" params={{ slug: nft.slug }} className="block">
          <img
            src={nft.imageUrl}
            alt={nft.imageAlt}
            width={236}
            height={236}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover"
          />
          <div className="space-y-1 p-5">
            <p className="truncate text-xs font-bold">{nft.name}</p>
            <p className="flex items-baseline gap-2">
              <span className="text-base font-bold text-accent">{formatEthWithUnit(nft.price)}</span>
              {nft.compareAtPrice ? (
                <span className="text-3xs text-clay line-through">
                  {formatEthWithUnit(nft.compareAtPrice)}
                </span>
              ) : null}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
