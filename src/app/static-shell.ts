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
export const SHELL_HERO_IMAGE = '/nft/ape-bucket.webp'

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

export function artworkForToken(token: number, offset = 0): string | undefined {
  const index = (token - TOKEN_BASE) / TOKEN_STEP
  if (index < 0 || index % 1 !== 0) return undefined
  return `/nft/${ARTWORK_FILES[(index + offset) % ARTWORK_FILES.length]}.webp`
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

export const SHELL_HTML = `<div id="${SHELL_ROOT_ID}" aria-hidden="true">
<header class="border-b border-line">
<div class="mx-auto flex h-18 max-w-page items-center justify-between gap-6 px-4 sm:px-8">
<span class="text-xs font-bold tracking-[0.1em]">KURIO</span>
<nav class="hidden md:block"><ul class="flex items-center gap-8">${NAV.map(
  (label) => `<li><span class="text-base text-foreground/90">${label}</span></li>`,
).join('')}</ul></nav>
<span class="flex items-center gap-2 sm:gap-4"></span>
</div>
</header>
<section id="shell-hero" class="mx-auto max-w-page px-4 pt-12 sm:px-8">
<div class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
<div class="max-w-xl space-y-6">
<p class="text-xs font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
<h1 class="text-[clamp(1.75rem,6.2vw,2.6875rem)] leading-[1.35] font-bold uppercase">${SHELL_HEADLINE}</h1>
<p class="text-xs text-muted">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
<span class="inline-block rounded-sm bg-primary px-6 py-3 text-base font-bold text-primary-foreground uppercase">Explorar</span>
</div>
<div class="aspect-square w-full max-w-[420px] lg:justify-self-end"><img src="${SHELL_HERO_IMAGE}" alt="" width="420" height="420" fetchpriority="high" decoding="async" class="size-full rounded-lg object-cover shadow-card" /></div>
</div>
</section>
<article id="shell-detail" hidden class="mx-auto max-w-page px-4 py-8 sm:px-8">
<nav class="text-sm font-bold"><ol class="flex flex-wrap items-center"><li><span class="text-sand">Início</span></li><li class="px-2 text-clay">/</li><li><span class="text-sand">Mercado</span></li></ol></nav>
<div class="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
<div class="flex gap-4">
<ul class="flex shrink-0 flex-col gap-3">${GALLERY_OFFSETS.map((_, position) => thumb(position)).join('')}</ul>
<img alt="" width="600" height="600" fetchpriority="high" decoding="async" class="aspect-square min-w-0 flex-1 rounded-md border border-line object-cover" data-shell-main />
</div>
</div>
</article>
</div>
<script>(function(){var p=location.pathname,d=document,hero=d.getElementById('shell-hero'),detail=d.getElementById('shell-detail');
if(p!=='/'&&hero)hero.remove();
var m=p.match(/^\\/nft\\/.+-(\\d+)$/),i=m?(+m[1]-${TOKEN_BASE})/${TOKEN_STEP}:-1;
if(i<0||i%1!==0){if(detail)detail.remove();return}
var files=${JSON.stringify(ARTWORK_FILES)},offsets=${JSON.stringify(GALLERY_OFFSETS)},
url=function(o){return '/nft/'+files[(i+o)%${ARTWORK_FILES.length}]+'.webp'};
d.querySelector('[data-shell-main]').src=url(offsets[0]);
offsets.forEach(function(o,n){d.querySelector('[data-shell-thumb="'+n+'"]').src=url(o)});
detail.hidden=false})()</script>`
