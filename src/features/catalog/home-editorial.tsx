import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { artworkForToken, TOKEN_BASE, TOKEN_STEP } from '@/app/static-shell'
import { env } from '@/shared/config/env'

/**
 * O fim da home no layout: duas chamadas com arte e, abaixo, o "Diário da
 * Cunhagem".
 *
 * As artes saem da mesma derivação determinística que o shell usa — são as
 * peças do catálogo semeado, não imagens novas —, então nada aqui depende de
 * uma consulta nem atrasa a primeira dobra.
 *
 * Os artigos são editoriais, e editorial está fora do escopo do desafio: os
 * cartões existem porque o layout os tem, e o "Ler mais" leva à página que
 * explica isso, em vez de simular um texto que não foi escrito.
 */
const art = (index: number) => artworkForToken(TOKEN_BASE + index * TOKEN_STEP, 0, env.basePath)

const PROMOS = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    body: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    art: art(0),
    alt: 'Macaco de óculos escuros e jaqueta college verde',
    search: { tab: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    body: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    art: art(2),
    alt: 'Macaco de gola alta verde e paletó claro',
    search: { tab: 'trending' as const },
  },
]

const POSTS = [
  {
    date: '12 de setembro',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    body: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    art: art(2),
    alt: 'Macaco de gola alta verde e paletó claro',
  },
  {
    date: '13 de setembro',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    body: 'Conheça criadores que moldam a cultura digital.',
    art: art(0),
    alt: 'Macaco de óculos escuros e jaqueta college verde',
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    body: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    art: art(1),
    alt: 'Macaco de chapéu e moletom roxo',
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    body: 'Proteja sua carteira, seus ativos e sua identidade.',
    art: art(3),
    alt: 'Macaco de fones de ouvido e camisa clara',
  },
]

export default function HomeEditorial() {
  return (
    <>
      <section aria-labelledby="destaques-editoriais" className="mx-auto max-w-page px-4 sm:px-8">
        <h2 id="destaques-editoriais" className="sr-only">
          Destaques da curadoria
        </h2>

        <ul className="grid gap-6 md:grid-cols-2">
          {PROMOS.map((promo) => (
            <li key={promo.title}>
              {/* No layout a arte sangra até as bordas do cartão e ocupa cerca
                  de um terço dele; o texto fica à direita, alinhado à direita. */}
              <article className="flex h-full items-stretch overflow-hidden rounded-2xl bg-card-raised md:rounded-md">
                <img
                  src={promo.art}
                  alt={promo.alt}
                  width={260}
                  height={260}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-[38%] max-w-[260px] shrink-0 object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col items-end justify-center gap-3 p-5 text-right">
                  <h3 className="max-w-[16ch] text-base font-bold text-balance md:text-lg">{promo.title}</h3>
                  <p className="max-w-[28ch] text-3xs text-muted">{promo.body}</p>
                  <Link
                    to="/mercado"
                    search={promo.search}
                    className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-3xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Explorar
                    <ArrowRight aria-hidden size={14} />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="diario-da-cunhagem" className="mx-auto max-w-page px-4 sm:px-8">
        <h2 id="diario-da-cunhagem" className="text-center text-h2 font-bold">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-center text-3xs text-muted">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {POSTS.map((post) => (
            <li key={post.title}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-card md:rounded-md">
                <img
                  src={post.art}
                  alt={post.alt}
                  width={280}
                  height={280}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-micro text-clay">
                    {post.date} <span aria-hidden>|</span> {post.reading}
                  </p>
                  <h3 className="text-xs font-bold">{post.title}</h3>
                  <p className="text-3xs text-muted">{post.body}</p>
                  <Link
                    to="/aprenda"
                    className="mt-auto inline-flex items-center gap-1 text-3xs font-bold text-accent"
                  >
                    Ler mais
                    <ArrowRight aria-hidden size={12} />
                    <span className="sr-only">sobre {post.title}</span>
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
