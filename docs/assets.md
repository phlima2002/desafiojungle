# Assets

## Ilustrações

O arquivo do Figma usa **quatro** ilustrações (retratos de macacos), reutilizadas
em todos os cards, no herói e nos avatares. Elas estão no repositório como:

```
public/nft/ape-varsity.webp
public/nft/ape-bucket.webp
public/nft/ape-noir.webp
public/nft/ape-headphones.webp
```

São as obras originais do Figma, exportadas em PNG 1254×1254 e reencodadas em
**WebP 512×512 (qualidade ~0,78)**. O card apresenta 368 px e a página de detalhe
600 px, então 512 px mantém nitidez em telas 1× e 2× sem penalizar o LCP — cada
arquivo fica entre 14 kB e 20 kB.

As descrições (`alt`) ficam em `src/mocks/fixtures/catalog.ts`:

| Arquivo          | Alternativa textual                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `ape-varsity`    | Macaco de óculos escuros com jaqueta college verde sobre fundo bege |
| `ape-bucket`     | Macaco de chapéu bucket verde e moletom roxo sobre fundo creme      |
| `ape-noir`       | Macaco de pelagem escura com blazer claro sobre fundo verde-água    |
| `ape-headphones` | Macaco ruivo de fones de ouvido verdes sobre fundo menta            |

Para trocar ou acrescentar uma arte, exporte o PNG do Figma e rode:

```bash
cwebp -q 78 -resize 512 512 "nova-arte.png" -o "public/nft/nova-arte.webp"
```

depois registre o arquivo em `ARTWORKS` (`src/mocks/db/seed.ts`), com o `alt`
correspondente.

## Ícones

Os ícones de interface vêm do `lucide-react`. Os links sociais do rodapé usam
**lettermarks neutras** em vez dos logotipos das redes: o pacote não traz ícones
de marca, e reproduzir logotipos de terceiros não é apropriado num teste técnico.

## Fontes

**Roboto Mono** é auto-hospedada via `@fontsource-variable/roboto-mono`, servida
do mesmo domínio, em `woff2` com `unicode-range` por subconjunto — o navegador
baixa apenas `latin`. Não há requisição a `fonts.googleapis.com` nem a
`fonts.gstatic.com`.
