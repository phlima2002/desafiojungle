/**
 * Build-time application shell.
 *
 * The bundle is ~190 kB gzipped and, on a throttled mobile profile, nothing at
 * all painted until React had booted: first contentful paint landed at ~2.8 s
 * and dragged LCP to ~4 s. This markup is injected into `#root` at build time,
 * so the header and the hero headline paint from the HTML document alone,
 * before a single byte of JavaScript is parsed.
 *
 * `createRoot()` clears the container when React renders, so the shell is a
 * one-way placeholder — it is never hydrated. Two rules keep the swap
 * invisible:
 *
 * 1. The header keeps the exact height of the real one (`h-18` + bottom
 *    border), and the hero image box keeps the exact track the image lands in,
 *    so replacing the shell shifts nothing (CLS stays at 0).
 * 2. The headline text and classes must match `HomeHero`. `tests/e2e/shell.spec.ts`
 *    asserts that, so drift fails the suite rather than the audit.
 *
 * The header is shelled on every route; the hero only on `/`, which the inline
 * script at the end takes care of during parsing — the same `index.html` is the
 * SPA fallback for every URL, so a deep link must not flash the home hero.
 */
export const SHELL_ROOT_ID = 'shell'

const NAV = [
  ['/', 'Início'],
  ['/mercado', 'Mercado'],
  ['/criadores', 'Criadores'],
  ['/aprenda', 'Aprenda'],
] as const

export const SHELL_HEADLINE = 'Seja dono do futuro<br />da arte digital'

/**
 * The hero image is the LCP element, and Lighthouse was right to complain that
 * it was not "discoverable in the initial document": it only existed once the
 * bundle, the mock worker and the featured query had all run. The catalogue is
 * seeded deterministically, so the hero artwork is known ahead of time and the
 * shell can ship the real `<img>`. `tests/e2e/shell.spec.ts` asserts that this
 * is the image the application actually renders, so a change of seed or of
 * fixtures fails the suite instead of silently costing 15 points.
 */
export const SHELL_HERO_IMAGE = '/nft/ape-bucket.webp'

export const SHELL_HTML = `<div id="${SHELL_ROOT_ID}" aria-hidden="true">
<header class="border-b border-line">
<div class="mx-auto flex h-18 max-w-page items-center justify-between gap-6 px-4 sm:px-8">
<span class="text-xs font-bold tracking-[0.1em]">KURIO</span>
<nav class="hidden md:block"><ul class="flex items-center gap-8">${NAV.map(
  ([, label]) => `<li><span class="text-base text-foreground/90">${label}</span></li>`,
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
</div>
<script>if(location.pathname!=='/'){var h=document.getElementById('shell-hero');h&&h.remove()}</script>`
