import { GALLERY_OFFSETS, artworkForToken } from '@/app/static-shell'
import { env } from '@/shared/config/env'

/**
 * Carregando o detalhe. A arte não vira um retângulo cinza: ela já está no
 * documento (o shell de build a coloca lá) e é derivável do slug, então o
 * esqueleto mantém a imagem e só marca o texto que ainda não chegou — o
 * colecionador não vê a obra piscar para fora da tela.
 *
 * A estrutura acompanha a de `NftDetailPage`, para que o commit real não
 * desloque nada.
 */
export function NftDetailSkeleton({ slug }: { slug?: string }) {
  const token = Number(slug?.split('-').pop())
  const gallery = GALLERY_OFFSETS.map((offset) =>
    Number.isFinite(token) ? artworkForToken(token, offset, env.basePath) : undefined,
  )
  const main = gallery[0]

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-8" aria-hidden>
      <div className="skeleton h-5 w-40" />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex gap-4">
          <ul className="flex shrink-0 flex-col gap-3">
            {gallery.map((url, index) => (
              <li key={GALLERY_OFFSETS[index]}>
                {/* Mesma caixa do `Button` que a página real usa: 64 px com a
                    borda por dentro, para que a imagem principal não mude de
                    tamanho entre o esqueleto e o conteúdo. */}
                <span className="block size-16 overflow-hidden rounded-sm border-2 border-transparent">
                  {url ? (
                    <img src={url} alt="" width={64} height={64} className="size-full object-cover" />
                  ) : (
                    <span className="skeleton block size-full" />
                  )}
                </span>
              </li>
            ))}
          </ul>

          {main ? (
            <img
              src={main}
              alt=""
              width={600}
              height={600}
              fetchPriority="high"
              decoding="async"
              className="aspect-square min-w-0 flex-1 rounded-md border border-line object-cover"
            />
          ) : (
            <div className="skeleton aspect-square min-w-0 flex-1 rounded-md" />
          )}
        </div>

        <div className="space-y-4">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-12 w-48" />
        </div>
      </div>
    </div>
  )
}
