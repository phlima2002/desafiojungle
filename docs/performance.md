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

| Página          | Perfil  | Performance | Accessibility | Best Practices |    SEO |    LCP | CLS |    TBT |
| --------------- | ------- | ----------: | ------------: | -------------: | -----: | -----: | --: | -----: |
| Início          | desktop |      **99** |       **100** |        **100** | **92** | 0,98 s |   0 |   4 ms |
| Detalhes do NFT | desktop |      **99** |        **96** |        **100** | **92** | 0,85 s |   0 |   1 ms |
| Início          | mobile  |          81 |       **100** |        **100** | **92** | 3,53 s |   0 | 266 ms |
| Detalhes do NFT | mobile  |          77 |       **100** |        **100** | **92** | 4,03 s |   0 | 262 ms |

Metas: Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 90.

**Atingidas:** acessibilidade, boas práticas e SEO em todas as páginas e perfis;
performance no perfil desktop.
**Não atingida:** performance no perfil mobile.

## Análise do resultado abaixo da meta

O elemento de LCP no mobile é o **parágrafo do herói** — texto, não imagem. No
trace real ele pinta em ~380 ms (`observedLargestContentfulPaint`); os 3,5 s são
a projeção do Lighthouse com a rede Slow 4G e a CPU 4× mais lenta. Ou seja, o
gargalo não é rede de imagens nem layout: é **quanto JavaScript precisa ser
baixado, analisado e executado antes do primeiro pixel de conteúdo**, num app
100% client-side.

Decomposição do caminho crítico (gzip):

| Recurso                             |     Tamanho | Papel                                  |
| ----------------------------------- | ----------: | -------------------------------------- |
| `react`                             |      ~66 kB | React + React DOM                      |
| `router`                            |      ~26 kB | TanStack Router                        |
| `zod`                               |      ~37 kB | Contratos e validação de search params |
| `query`                             |      ~13 kB | TanStack Query                         |
| entrada + rotas + providers         |      ~35 kB | Aplicação                              |
| **Total antes da primeira pintura** | **~177 kB** |                                        |

A camada de mocks (~165 kB gzip) **não** está nesse caminho: ela é carregada
depois da primeira pintura, atrás de um _network gate_ que segura as requisições
até o worker estar de pé (ver `shared/api/client.ts` e `main.tsx`).

`auditoria mobileL` `mainthread-work-breakdown` aponta ~2,4 s de trabalho de
thread principal na projeção — coerente com analisar e executar 177 kB comprimidos
com CPU 4× desacelerada.

### O que já foi feito

- Primeira pintura antes do boot dos mocks (network gate) — LCP caiu ~300 ms.
- `socket.io-client` carregado sob demanda, fora do caminho crítico, e conexão
  agendada em `requestIdleCallback`.
- Fonte variável auto-hospedada, subconjunto latino **pré-carregado** a partir do
  HTML (sem `fonts.gstatic.com`).
- CSS único embutido no documento (uma ida e volta a menos).
- CLS zerado: trilha fixa para a imagem do herói e placeholders com a altura
  final nos filtros e nos cards.
- `manualChunks` afinado para que formulários, ícones e transporte de tempo real
  não entrem no bundle inicial.

### O que falta para passar de 90 no mobile

A correção decisiva é **pintar o shell a partir do HTML**: gerar, no build, a
marcação estática do cabeçalho e do bloco do herói dentro de `#root`, de modo que
o elemento de LCP não dependa de JavaScript. Pela decomposição acima, isso levaria
o LCP mobile para a faixa de 1 s e a nota para ~95, sem alterar nada do que é
entregue ao usuário — é a mesma página, pintada antes.

Essa mudança não foi incluída ainda porque exige fatorar cabeçalho e herói em
componentes sem hooks, compartilhados entre o render de build e o de runtime,
para que as duas marcações não divirjam com o tempo. Está mapeada como o próximo
passo de performance.
