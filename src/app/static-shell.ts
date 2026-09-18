/**
 * Build-time application shell.
 *
 * The bundle is ~190 kB gzipped and, on a throttled mobile profile, nothing at
 * all painted until React had booted: first contentful paint landed at ~2.8 s
 * and dragged LCP to ~4 s. This markup is injected next to `#root` at build
 * time, so the header and the artwork the visitor came for paint from the HTML
 * document alone, before a single byte of JavaScript is parsed.
 *
 * The shell is a placeholder, never hydrated. `#root` starts hidden and
 * `shell-handoff.ts` swaps the two once the first screen can be drawn for real
 * — see that file for why the swap waits.
 *
 * Three rules keep the swap invisible, and `tests/e2e/shell.spec.ts` checks all
 * three against the running application so drift fails the suite instead of the
 * audit:
 *
 * 1. The header keeps the exact height of the real one (`h-18` + bottom border)
 *    and every image box keeps the exact track its image lands in, so the swap
 *    shifts nothing (CLS stays at 0).
 * 2. The headline text and classes match `HomeHero`.
 * 3. The artwork matches what the application renders on that route.
 *
 * The header is shelled on every route; the rest depends on the path, which the
 * inline script at the end resolves during parsing — `index.html` is the SPA
 * fallback for every URL, so a deep link must not flash the home hero.
 */
export const SHELL_ROOT_ID = 'shell'

const NAV = ['Início', 'Mercado', 'Criadores', 'Aprenda']

export const SHELL_HEADLINE = 'Seja dono do futuro<br />da arte digital'

/**
 * The hero image is the LCP element on `/`, and Lighthouse was right to
 * complain that it was not "discoverable in the initial document": it only
 * existed once the bundle, the mock worker and the featured query had all run.
 * The catalogue is seeded deterministically, so the hero artwork is known ahead
 * of time and the shell ships the real `<img>`.
 */
export const SHELL_HERO_FILE = 'ape-bucket'
export const heroImage = (base = '/') => `${base}nft/${SHELL_HERO_FILE}.webp`

/**
 * Same problem on `/nft/<slug>`, where the LCP element is the artwork and the
 * URL is only known after the detail query resolves. A server-rendered document
 * would carry the `<img>`; with a mocked API the equivalent is to derive it.
 *
 * The seeded catalogue assigns artwork by catalogue index and encodes that same
 * index in the slug's token (`…-100`, `…-107`, `…-114`, …), so the path is
 * enough to resolve both the main image and the two thumbnails beside it.
 */
export const ARTWORK_FILES = ['ape-varsity', 'ape-bucket', 'ape-noir', 'ape-headphones']
export const TOKEN_BASE = 100
export const TOKEN_STEP = 7
/** The gallery offsets `seed.ts` uses, in order. */
export const GALLERY_OFFSETS = [0, 1, 3]

/**
 * `base` é o `BASE_URL` do Vite: a aplicação também roda servida de um
 * subcaminho (GitHub Pages), e aí os caminhos absolutos precisam do prefixo.
 */
export function artworkForToken(token: number, offset = 0, base = '/'): string | undefined {
  const index = (token - TOKEN_BASE) / TOKEN_STEP
  if (index < 0 || index % 1 !== 0) return undefined
  return `${base}nft/${ARTWORK_FILES[(index + offset) % ARTWORK_FILES.length]}.webp`
}

/**
 * `size-16` na moldura, não na imagem: a miniatura da página real é um `Button`
 * de 64 px com `border-2` por dentro. Quatro pixels de diferença aqui alargam a
 * imagem principal, e uma imagem maior que a do shell vira um novo candidato a
 * LCP — o shell perde a função.
 */
const thumb = (position: number) =>
  `<li><span class="block size-16 overflow-hidden rounded-sm border-2 ${
    position === 0 ? 'border-primary' : 'border-transparent'
  }"><img alt="" width="64" height="64" decoding="async" class="size-full object-cover" data-shell-thumb="${position}" /></span></li>`

/**
 * Os primeiros cartões do catálogo, no documento.
 *
 * No celular o herói do Figma é um cartão pequeno, com a arte em 120px: ele
 * deixou de ser o maior elemento da primeira dobra, e o LCP passou para a
 * primeira imagem da grade — que só existe depois do bundle, do worker de
 * mocks e da consulta. A medição caiu de 91 para 77 por isso.
 *
 * A grade é semeada de forma determinística e a ordenação padrão é a mais
 * recente primeiro, que é a ordem do índice: o primeiro cartão é o índice 0, o
 * segundo o 1, e a arte de cada um sai da mesma função que o detalhe usa. Com
 * isso as imagens voltam a ser descobríveis no documento inicial.
 *
 * As faixas no lugar do nome e do preço existem só para reservar a altura: sem
 * elas o texto real empurraria a grade para baixo ao chegar (foi o CLS de 0,015
 * que a auditoria apontou).
 */
const shellCard = (index: number, base: string) =>
  `<li><article class="flex flex-col gap-3"><div class="overflow-hidden rounded-2xl bg-card-raised sm:rounded-md"><img src="${artworkForToken(
    TOKEN_BASE + index * TOKEN_STEP,
    0,
    base,
  )}" alt="" width="368" height="368" ${
    index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async" class="aspect-square w-full object-cover" /></div><div class="space-y-1"><span class="block h-4 w-3/4 rounded-xs bg-card-raised"></span><span class="block h-4 w-1/3 rounded-xs bg-card-raised"></span></div></article></li>`

export const buildShellHtml = (base = '/') => `<div id="${SHELL_ROOT_ID}" aria-hidden="true">
<header class="hidden border-b border-line md:block">
<div class="mx-auto flex h-18 max-w-page items-center justify-between gap-6 px-4 sm:px-8">
<span class="text-xs font-bold tracking-[0.1em]">KURIO</span>
<nav class="hidden md:block"><ul class="flex items-center gap-8">${NAV.map(
  (label) => `<li><span class="text-base text-foreground/90">${label}</span></li>`,
).join('')}</ul></nav>
<span class="flex items-center gap-2 sm:gap-4"></span>
</div>
</header>
<div id="shell-bar" class="mx-auto flex max-w-page items-center gap-3 px-4 pt-4 sm:px-8 lg:hidden">
<span class="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-card"></span>
<span class="size-12 shrink-0 rounded-2xl bg-primary"></span>
</div>
<section id="shell-hero" class="mx-auto max-w-page px-4 pt-4 sm:px-8 md:pt-12">
<div class="rounded-3xl bg-card-raised p-5 md:rounded-none md:bg-transparent md:p-0">
<div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
<div class="max-w-xl space-y-2 md:space-y-6">
<p class="text-3xs font-medium tracking-[0.1em] whitespace-nowrap md:text-xs">Bem-vindo à Kurio</p>
<h1 class="text-[clamp(1.05rem,4.6vw,2.6875rem)] leading-[1.35] font-bold uppercase">${SHELL_HEADLINE}</h1>
<p class="line-clamp-3 text-3xs text-muted md:line-clamp-none md:text-xs">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
<span class="inline-flex items-center gap-2 text-3xs font-bold text-accent uppercase md:rounded-sm md:bg-primary md:px-6 md:py-3 md:text-base md:text-primary-foreground">Explorar</span>
</div>
<div class="aspect-square w-[7.5rem] sm:w-[13rem] md:w-full md:max-w-[420px] lg:justify-self-end"><img src="${heroImage(base)}" alt="" width="420" height="420" fetchpriority="high" decoding="async" class="size-full rounded-2xl object-cover shadow-card md:rounded-lg" /></div>
</div>
<div class="-mb-2 mt-2 flex justify-center md:hidden"><span class="grid size-6 place-items-center"><span class="block size-2 rounded-pill bg-primary"></span></span><span class="grid size-6 place-items-center"><span class="block size-2 rounded-pill bg-line-strong"></span></span><span class="grid size-6 place-items-center"><span class="block size-2 rounded-pill bg-line-strong"></span></span></div>
</div>
</section>
<section id="shell-grid" class="mx-auto mt-10 max-w-page px-4 sm:px-8 md:mt-16">
<div class="grid gap-8 lg:grid-cols-[236px_minmax(0,1fr)]">
<div class="hidden lg:block"></div>
<div class="min-w-0 space-y-6">
<div class="flex flex-wrap items-center justify-between gap-4"><div class="flex gap-6 pb-1"><span class="border-b-2 border-primary pb-1 text-sm font-medium text-accent">Todos os NFTs</span><span class="border-b-2 border-transparent pb-1 text-sm text-sand">Novos lançamentos</span><span class="border-b-2 border-transparent pb-1 text-sm text-sand">Em alta</span></div></div>
<ul class="grid grid-cols-2 gap-4 max-sm:[&>li:nth-child(even)]:mt-10 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">${[
  0, 1, 2,
]
  .map((index) => shellCard(index, base))
  .join('')}</ul>
</div>
</div>
</section>
<article id="shell-detail" hidden class="mx-auto max-w-page pb-8 md:px-4 md:py-8 lg:px-8">
<div class="hidden md:block"><nav class="text-sm font-bold"><ol class="flex flex-wrap items-center"><li><span class="text-sand">Início</span></li><li class="px-2 text-clay">/</li><li><span class="text-sand">Mercado</span></li></ol></nav></div>
<div class="grid gap-6 md:mt-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
<div class="relative flex flex-col-reverse gap-4 md:flex-row">
<ul class="flex shrink-0 gap-3 px-4 md:flex-col md:px-0">${GALLERY_OFFSETS.map((_, position) => thumb(position)).join('')}</ul>
<img alt="" width="600" height="600" fetchpriority="high" decoding="async" class="aspect-square min-w-0 flex-1 rounded-b-3xl object-cover md:rounded-md md:border md:border-line" data-shell-main />
</div>
</div>
</article>
</div>
<script>(function(){var b=${JSON.stringify(base)},d=document,p=location.pathname.slice(b.length-1),
hero=d.getElementById('shell-hero'),bar=d.getElementById('shell-bar'),grid=d.getElementById('shell-grid'),detail=d.getElementById('shell-detail');
if(p!=='/'&&hero)hero.remove();
if(p!=='/'&&p!=='/mercado'&&bar)bar.remove();
/* A grade semeada vale para a listagem sem recorte. Qualquer busca, filtro,
   ordenação ou página muda o que aparece — aí é melhor não pintar nada. Outros
   parâmetros (o cenário dos mocks, por exemplo) não mexem na listagem. */
var cut=['q','tab','categoria','rede','min','max','ordenar','pagina'],
q=new URLSearchParams(location.search);
if(grid&&(p!=='/'||cut.some(function(k){return q.has(k)})))grid.remove();
var m=p.match(/^\\/nft\\/.+-(\\d+)$/),i=m?(+m[1]-${TOKEN_BASE})/${TOKEN_STEP}:-1;
if(i<0||i%1!==0){if(detail)detail.remove();return}
var files=${JSON.stringify(ARTWORK_FILES)},offsets=${JSON.stringify(GALLERY_OFFSETS)},
url=function(o){return b+'nft/'+files[(i+o)%${ARTWORK_FILES.length}]+'.webp'};
d.querySelector('[data-shell-main]').src=url(offsets[0]);
offsets.forEach(function(o,n){d.querySelector('[data-shell-thumb="'+n+'"]').src=url(o)});
detail.hidden=false})()</script>`
