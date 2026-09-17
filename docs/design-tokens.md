# Design tokens

Os valores abaixo foram extraídos do arquivo **“Frontend Challenge / Marketplace
de NFTs GreenMint”** pela API REST do Figma (`GET /v1/files/:key`), percorrendo a
árvore de nós e agregando `fills`, `strokes`, `style`, `cornerRadius`,
`itemSpacing`, `padding` e `effects`. Não houve leitura “a olho” de screenshot:
cada hex e cada tamanho abaixo é o valor literal do arquivo.

Os tokens vivem em `src/styles/index.css`, no bloco `@theme` do Tailwind v4.

## Cores

| Token                    | Hex                   | Papel no layout                         | Ocorrências no arquivo |
| ------------------------ | --------------------- | --------------------------------------- | ---------------------- |
| `--color-cream`          | `#f5f1eb`             | Texto principal                         | 427                    |
| `--color-amber-500`      | `#d28a4c`             | Ação primária, borda de foco            | 168                    |
| `--color-sand`           | `#cfb28c`             | Texto secundário                        | 160                    |
| `--color-amber-400`      | `#e89b55`             | Preços, links, item ativo               | 140                    |
| `--color-ink-900`        | `#241612`             | Superfície de card/painel               | 89                     |
| `--color-clay`           | `#b39463`             | Texto terciário, desabilitado           | 86                     |
| `--color-ink-950`        | `#140d0a`             | Fundo da página, texto sobre âmbar      | 82                     |
| `--color-danger`         | `#f0805f`             | Alertas, marcador obrigatório           | 38                     |
| `--color-ink-800`        | `#2f1d15`             | Superfície elevada, parada de gradiente | 27                     |
| `--color-ink-700`        | `#38220f`             | Blocos em destaque                      | 17                     |
| `--color-amber-300`      | `#e3a44e`             | Avaliação, realce                       | 16                     |
| `--color-line`           | `#3f2319`             | Borda padrão (112 traços)               | 112                    |
| `--color-line-strong`    | `#55321f`             | Borda enfatizada                        | 15                     |
| `--color-success`        | `#59c36a` / `#00a66c` | Confirmação                             | 8                      |
| `--color-warning`        | `#ffda2d`             | Atenção                                 | 4                      |
| `--color-danger-strong`  | `#ed1b2e`             | Erro forte                              | 2                      |
| `--color-brand-google`   | `#4086f4`             | Botão social                            | 4                      |
| `--color-brand-facebook` | `#3b5999`             | Botão social                            | 4                      |

Gradiente do herói/cards: `linear-gradient(#241612 → #2f1d15)`.

## Tipografia

Família única: **Roboto Mono** (400/500/700), auto-hospedada via
`@fontsource-variable/roboto-mono` — nenhuma requisição a `fonts.googleapis.com`,
o que ajuda LCP e evita um domínio externo na auditoria.

| Token           | Tamanho / entrelinha                   | Uso no Figma                                    |
| --------------- | -------------------------------------- | ----------------------------------------------- |
| `text-display`  | 43 / 70 px, 700                        | “SEJA DONO DO FUTURO DA ARTE DIGITAL”           |
| `text-wordmark` | 32 / 42 px, 700, `letter-spacing: 3.2` | “KURIO” no rodapé                               |
| `text-h1`       | 28 / 37 px, 700                        | Título de coleção e de NFT                      |
| `text-h2`       | 24 / 32 px, 700                        | “NFT EM DESTAQUE”                               |
| `text-h3`       | 22 / 29 px                             | “OFERTA LIMITADA”, preço grande                 |
| `text-h4`       | 20 / 28 px                             | Nome do NFT no detalhe                          |
| `text-lg`       | 18 / 24 px, 700                        | Títulos de bloco (“Coleções”, “Faixa de preço”) |
| `text-md`       | 17 / 24 px, 700                        | Subtítulos (“Segurança da carteira”)            |
| `text-base`     | 16 / 21 px                             | Navegação, nome nos cards, preços               |
| `text-sm`       | 15 / 20 px                             | Filtros, rótulos, “Ordenar por:”                |
| `text-xs`       | 14 / 22 px                             | Texto corrido, campos                           |
| `text-2xs`      | 13 / 22 px                             | Apoio, newsletter                               |
| `text-3xs`      | 12 / 16 px                             | Metadados, “Ler mais”                           |
| `text-micro`    | 10 / 13 px                             | Contador do carrinho                            |
| `text-eyebrow`  | 9 / 12 px, `letter-spacing: 0.1`       | “METAMASK • WALLETCONNECT • COINBASE”           |

## Raios

`3, 4, 5, 6, 8, 10, 14, 15, 16, 20, 37 px` no arquivo. Foram normalizados para a
escala `--radius-xs: 3 · sm: 4 · md: 6 · lg: 8 · xl: 16 · pill: 999`, que cobre
as ocorrências dominantes (3 px: 53×, 6 px: 48×, 4 px: 38×, 16 px: 29×, 8 px: 22×).

## Espaçamento

`itemSpacing` observado: `4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 96`.
Os dois valores dominantes são 10 px (269×) e 12 px (161×). `padding` mais comum:
`16 16`, `8 8 8 8`, `32 32 32 32`, `12 16 12 16` e `24 120 24 120` (faixa do
rodapé, equivalente ao contêiner de 1200 px em um frame de 1440 px).

## Elevação

| Token           | Valor                           | Origem                            |
| --------------- | ------------------------------- | --------------------------------- |
| `--shadow-card` | `0 8px 20px rgba(10,6,4,.45)`   | `DROP_SHADOW r20 #0a060473` (14×) |
| `--shadow-soft` | `0 4px 12px rgba(20,13,10,.15)` | `DROP_SHADOW r12 #140d0a26` (8×)  |
| `--shadow-pop`  | `0 12px 40px rgba(10,6,4,.45)`  | `DROP_SHADOW r40 #0a060473`       |

## Layout

Os frames desktop têm 1440 px de largura e o conteúdo ocupa 1200 px
(`--container-page`), com 120 px de respiro de cada lado. Os frames mobile têm
414 px. Os breakpoints avaliados são 390, 768 e 1440 px.
