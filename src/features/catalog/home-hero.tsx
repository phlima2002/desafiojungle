import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useFeaturedQuery } from './use-catalog'
import { heroImage } from '@/app/static-shell'
import { env } from '@/shared/config/env'

/**
 * O herói tem duas formas. No desktop é a faixa larga do Figma: texto à
 * esquerda, arte de 420px à direita. No celular vira o cartão que o Figma
 * desenha — fundo próprio, cantos generosos, arte menor ao lado do texto e três
 * marcadores para percorrer os destaques.
 *
 * O carrossel troca só a arte, não o texto: a manchete é da marca, não do NFT,
 * e mantê-la fixa evita que o maior bloco de texto da página dance sob o dedo.
 * Não há troca automática — um herói que se move sozinho rouba o LCP de volta e
 * atrapalha quem lê devagar.
 */
export function HomeHero() {
  const featured = useFeaturedQuery()
  const slides = featured.data?.hero ?? []
  const [index, setIndex] = useState(0)
  const current = slides[Math.min(index, Math.max(slides.length - 1, 0))]

  // While the query is in flight the artwork is not unknown: the document was
  // served with it (see `app/static-shell.ts`). A skeleton here would blink the
  // piece out of the page for no reason, so the known image stays put.
  const heroSrc = current?.imageUrl ?? heroImage(env.basePath)

  return (
    <section className="mx-auto max-w-page px-4 pt-4 sm:px-8 md:pt-12">
      <div className="rounded-3xl bg-card-raised p-5 md:rounded-none md:bg-transparent md:p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="max-w-xl space-y-2 md:space-y-6">
            <p className="text-3xs font-medium tracking-[0.1em] whitespace-nowrap md:text-xs">
              Bem-vindo à Kurio
            </p>
            {/* The display size is fluid: the Figma desktop frame sets 43px/70px,
              which would overflow a 390px viewport in a monospace face. */}
            <h1 className="text-[clamp(1.05rem,4.6vw,2.6875rem)] leading-[1.35] font-bold uppercase">
              Seja dono do futuro
              <br />
              da arte digital
            </h1>
            <p className="line-clamp-3 text-3xs text-muted md:line-clamp-none md:text-xs">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
              apoie artistas e tenha uma parte da cultura da internet.
            </p>
            {/* No celular a chamada é um link em caixa alta com seta; no desktop,
                o botão sólido da faixa larga. */}
            <Link
              to="/mercado"
              search={{}}
              className="inline-flex items-center gap-2 text-3xs font-bold text-accent uppercase md:rounded-sm md:bg-primary md:px-6 md:py-3 md:text-base md:text-primary-foreground md:transition-opacity md:hover:opacity-90"
            >
              Explorar
              <ArrowRight aria-hidden size={14} className="md:hidden" />
            </Link>
          </div>

          {/* Fixed track + fixed box: the placeholder and the final image occupy
            exactly the same space, so swapping them shifts nothing. */}
          <div className="aspect-square w-[7.5rem] sm:w-[13rem] md:w-full md:max-w-[420px] lg:justify-self-end">
            <img
              src={heroSrc}
              alt={current?.imageAlt ?? ''}
              width={420}
              height={420}
              fetchPriority="high"
              decoding="async"
              className="size-full rounded-2xl object-cover shadow-card md:rounded-lg"
            />
          </div>
        </div>

        {/* Os marcadores ocupam o lugar desde o primeiro quadro, mesmo antes de
            a consulta dizer quantos destaques existem: renderizá-los só depois
            empurrava o catálogo para baixo ao chegarem (era o CLS de 0,015 que
            a auditoria apontava). O alvo de toque tem 24px — o ponto visível
            continua com 8. */}
        <div className="mt-2 -mb-2 flex justify-center md:hidden">
          {(slides.length > 0 ? slides.map((slide) => slide.id) : ['a', 'b', 'c']).map((id, position) => (
            <button
              key={id}
              type="button"
              disabled={slides.length === 0}
              aria-label={`Ver destaque ${position + 1} de ${slides.length || 3}`}
              aria-current={position === index}
              onClick={() => setIndex(position)}
              className="grid size-6 place-items-center"
            >
              <span
                aria-hidden
                className={cn(
                  'block size-2 rounded-pill transition-colors',
                  position === index ? 'bg-primary' : 'bg-line-strong',
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
