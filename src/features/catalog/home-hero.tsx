import { Link } from '@tanstack/react-router'
import { useFeaturedQuery } from './use-catalog'
import { heroImage } from '@/app/static-shell'
import { env } from '@/shared/config/env'

export function HomeHero() {
  const featured = useFeaturedQuery()
  const hero = featured.data?.hero[0]
  // While the query is in flight the artwork is not unknown: the document was
  // served with it (see `app/static-shell.ts`). A skeleton here would blink the
  // piece out of the page for no reason, so the known image stays put.
  const heroSrc = hero?.imageUrl ?? heroImage(env.basePath)

  return (
    <section className="mx-auto max-w-page px-4 pt-12 sm:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="max-w-xl space-y-6">
          <p className="text-xs font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
          {/* The display size is fluid: the Figma desktop frame sets 43px/70px,
              which would overflow a 390px viewport in a monospace face. */}
          <h1 className="text-[clamp(1.75rem,6.2vw,2.6875rem)] leading-[1.35] font-bold uppercase">
            Seja dono do futuro
            <br />
            da arte digital
          </h1>
          <p className="text-xs text-muted">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
            apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <Link
            to="/mercado"
            search={{}}
            className="inline-block rounded-sm bg-primary px-6 py-3 text-base font-bold text-primary-foreground uppercase transition-opacity hover:opacity-90"
          >
            Explorar
          </Link>
        </div>

        {/* Fixed track + fixed box: the placeholder and the final image occupy
            exactly the same space, so swapping them shifts nothing. */}
        <div className="aspect-square w-full max-w-[420px] lg:justify-self-end">
          <img
            src={heroSrc}
            alt={hero?.imageAlt ?? ''}
            width={420}
            height={420}
            fetchPriority="high"
            decoding="async"
            className="size-full rounded-lg object-cover shadow-card"
          />
        </div>
      </div>
    </section>
  )
}
