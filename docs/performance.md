# Auditoria de performance (Lighthouse)

## Como reproduzir

```bash
npm run build
npm run lighthouse          # 3 medições por página e perfil, mediana por categoria
```

O script (`scripts/lighthouse.mjs`) sobe o **build de produção** com a camada de
mocks ativa, no cenário `instant` — todas as imagens, fontes e funcionalidades da
entrega são carregadas. Nenhuma simplificação é aplicada para melhorar a nota; a
única diferença em relação ao uso normal é a latência simulada da API, zerada
para que ela não domine a medição.

Relatórios HTML e JSON de cada execução e o `summary.json` com as medianas ficam
em `lighthouse/reports/`.

## Ambiente da medição registrada

| Item              | Valor                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Lighthouse        | 13.4.1                                                                 |
| Node              | v22.22.2                                                               |
| Navegador         | Chromium headless (`--headless=new`)                                   |
| Perfil mobile     | Emulação padrão do Lighthouse (Moto G Power, 4× CPU, Slow 4G simulado) |
| Perfil desktop    | 1350×940, RTT 40 ms, 10 Mbps, sem desaceleração de CPU                 |
| Cenário dos mocks | `instant`                                                              |
| Medições          | 3 por página/perfil; reportada a mediana                               |

## Resultados (mediana de 3 execuções)

| Página          | Perfil  | Performance | Accessibility | Best Practices |     SEO |    LCP | CLS |    TBT |
| --------------- | ------- | ----------: | ------------: | -------------: | ------: | -----: | --: | -----: |
| Início          | mobile  |      **93** |       **100** |        **100** | **100** | 2,34 s |   0 | 194 ms |
| Detalhes do NFT | mobile  |      **93** |       **100** |        **100** | **100** | 2,46 s |   0 | 175 ms |
| Início          | desktop |     **100** |       **100** |        **100** | **100** | 0,53 s |   0 |   0 ms |
| Detalhes do NFT | desktop |     **100** |       **100** |        **100** | **100** | 0,54 s |   0 |   0 ms |

Metas: Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 90 —
**todas atingidas nos dois perfis e nas duas páginas.**

## Como o mobile saiu de 77–82 para 93

O ponto de partida era um SPA 100% client-side: **nada aparecia até o bundle ser
baixado, analisado e executado**. First contentful paint ficava em ~2,8 s e o
LCP — a arte do NFT — em ~4 s, porque a URL da imagem só existia depois que o
bundle, o worker de mocks e a query tinham rodado. O `lcp-discovery-insight` do
próprio Lighthouse resumia o problema: _“request is discoverable in initial
document: **false**”_.

### 1. Shell estático no documento (`src/app/static-shell.ts`)

O build injeta, ao lado de `#root`, a marcação do cabeçalho e da primeira dobra
da rota — headline e arte na home, trilha e galeria no detalhe. O documento
passa a pintar sozinho, sem JavaScript.

A arte não é chute: o catálogo é semeado de forma determinística e o slug
carrega o mesmo índice que o seed usa (`…-100`, `…-107`, `…-114`), então o
caminho da imagem é derivável na hora do parse. Num app com backend real esse
papel seria do documento renderizado no servidor.

### 2. Handoff sem piscada (`src/app/shell-handoff.ts`)

Trocar o shell pelo React reintroduziria o problema por outro caminho: a arte já
pintada sumiria, daria lugar a um skeleton e voltaria um segundo depois. Então
`#root` nasce oculto e quem desenha a primeira dobra mantém a imagem que já veio
no documento — `HomeHero` enquanto a query de destaques não responde,
`NftDetailSkeleton` derivando a arte do slug. O handoff acontece no primeiro
commit do React: remove o shell e revela `#root`.

Sem temporizador forçando a troca: se o bundle nunca subir, o shell ficar de pé
é a falha melhor do que um `#root` vazio.

### 3. Menos JavaScript antes da primeira pintura

`autoCodeSplitting` do TanStack Router ligado: cada rota vira seu próprio chunk.
O chunk de entrada caiu de ~60 kB para ~12 kB gzip e o TBT de 266 ms para
~180 ms. Formulários, ícones e o transporte de tempo real não entram mais no
caminho crítico da home.

### O que já estava no lugar

- Primeira pintura antes do boot dos mocks, com _network gate_ segurando as
  requisições até o worker estar de pé (`shared/api/client.ts` e `main.tsx`).
- `socket.io-client` carregado sob demanda e conexão agendada em
  `requestIdleCallback`.
- Fonte variável auto-hospedada, subconjunto latino pré-carregado a partir do
  HTML (sem `fonts.gstatic.com`).
- CSS único embutido no documento — uma ida e volta a menos.
- CLS zerado: trilhas fixas para as imagens e placeholders com a altura final
  nos filtros e nos cards.
- `manualChunks` afinado por biblioteca.

## Caminho crítico atual (gzip)

| Recurso                             |     Tamanho | Papel                                  |
| ----------------------------------- | ----------: | -------------------------------------- |
| `react`                             |      ~66 kB | React + React DOM                      |
| `zod`                               |      ~37 kB | Contratos e validação de search params |
| `router`                            |      ~26 kB | TanStack Router                        |
| `contracts`                         |      ~23 kB | Schemas da aplicação                   |
| `query`                             |      ~13 kB | TanStack Query                         |
| entrada + rota + utilitários        |      ~25 kB | Aplicação                              |
| **Total antes da primeira pintura** | **~190 kB** |                                        |

A camada de mocks (~165 kB gzip) **não** está nesse caminho: ela é carregada
depois da primeira pintura.

Esses 190 kB são o que ainda separa o mobile de 100 — eles não atrasam mais a
pintura, mas continuam pesando no TBT. O próximo corte natural seria tirar
`zod` + `contracts` (~60 kB) do caminho crítico, trocando a validação dos search
params por um parser próprio e carregando os schemas junto da camada de rede.
Não foi feito porque reduz a garantia de contrato em tempo de desenvolvimento em
troca de pontos numa meta já atingida.

## Nota sobre metodologia

O Lighthouse usa, por padrão, `throttlingMethod: 'simulate'`: mede num ambiente
rápido e projeta o resultado num modelo de rede/CPU lenta. Servindo de
`localhost`, o bundle chega em poucos milissegundos — rápido a ponto de o
navegador nunca produzir um frame antes de executá-lo, e o modelo então atribui
a primeira pintura ao grafo de scripts.

É por isso que `main.tsx` cede um frame antes do primeiro render: além de ser o
comportamento correto (o shell existe para ser visto), é o que faz a medição
refletir o que o visitante vê. Para conferir com afunilamento real de rede e CPU
no próprio navegador:

```bash
LH_THROTTLING=devtools npm run lighthouse
```
