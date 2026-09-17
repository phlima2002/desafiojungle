# Assets

## Situação atual

O arquivo do Figma usa **quatro** ilustrações (retratos de macacos), reutilizadas
em todos os cards, no herói e nos avatares. Elas estão referenciadas no
repositório como:

```
public/nft/ape-varsity.svg
public/nft/ape-bucket.svg
public/nft/ape-noir.svg
public/nft/ape-headphones.svg
```

Neste momento esses arquivos são **placeholders gerados por script**
(`npm run placeholders`), com a paleta de cada obra original, para que o projeto
rode a partir de um checkout limpo sem depender de nenhum download.

As descrições (`alt`) já correspondem às obras reais e ficam em
`src/mocks/fixtures/catalog.ts`:

| Arquivo          | Alternativa textual                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `ape-varsity`    | Macaco de óculos escuros com jaqueta college verde sobre fundo bege |
| `ape-bucket`     | Macaco de chapéu bucket verde e moletom roxo sobre fundo creme      |
| `ape-noir`       | Macaco de pelagem escura com blazer claro sobre fundo verde-água    |
| `ape-headphones` | Macaco ruivo de fones de ouvido verdes sobre fundo menta            |

## Substituindo pelos assets originais

1. Exporte as quatro imagens do Figma (ou obtenha os PNGs 1254×1254 originais).
2. Converta para WebP em 512 px (o tamanho apresentado é 368 px no card e 600 px
   no detalhe; 512 mantém nitidez sem penalizar o LCP):

   ```bash
   for f in ape-varsity ape-bucket ape-noir ape-headphones; do
     cwebp -q 80 -resize 512 512 "$f.png" -o "public/nft/$f.webp"
   done
   ```

3. Troque a extensão em `src/mocks/db/seed.ts` (`.svg` → `.webp`) e remova os
   placeholders.

## Fontes

**Roboto Mono** é auto-hospedada via `@fontsource-variable/roboto-mono`, servida
do mesmo domínio, em WebGL2-friendly `woff2` com `unicode-range` por subconjunto —
o navegador baixa apenas `latin`. Não há requisição a `fonts.googleapis.com` nem
a `fonts.gstatic.com`.
