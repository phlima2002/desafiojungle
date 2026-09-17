# Kurio — Marketplace de NFTs

Implementação do desafio de frontend “Marketplace de NFTs” em React + TypeScript,
com API, autenticação, carteiras e pagamentos **simulados** na camada de rede.

> Estado atual: fundação completa (contratos, mocks, tempo real, roteamento,
> estado remoto) e as telas de **Início**, **Mercado**, **Detalhes do NFT**,
> **Carrinho**, **Login** e **Cadastro**. Pagamento, confirmação, perfil e
> carteiras têm contratos, endpoints e handlers prontos — as telas estão em
> construção. Veja [ARCHITECTURE.md](./ARCHITECTURE.md) para decisões e
> limitações.

## Stack

| Responsabilidade | Tecnologia                                          |
| ---------------- | --------------------------------------------------- |
| Interface        | React 19                                            |
| Linguagem        | TypeScript                                          |
| Roteamento       | TanStack Router (file-based, search params tipados) |
| Estado remoto    | TanStack Query v5                                   |
| Cliente HTTP     | Axios                                               |
| Contratos        | Zod (validação de request e response)               |
| Tempo real       | Socket.IO (`socket.io-client`)                      |
| Estilização      | Tailwind CSS v4 (tokens extraídos do Figma)         |
| Mocking          | MSW v2 + `@mswjs/socket.io-binding`                 |
| Testes E2E       | Playwright (Chromium, desktop + mobile)             |
| Build            | Vite                                                |

## Setup

```bash
npm install
cp .env.example .env      # opcional: os defaults já funcionam
npm run dev               # http://localhost:5173
```

Nenhum serviço externo é necessário. O app sobe com a camada de mocks ativa: a
API REST e o canal Socket.IO são interceptados no navegador.

### Variáveis de ambiente

| Variável            | Padrão                   | O que faz                                      |
| ------------------- | ------------------------ | ---------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                   | Prefixo de todas as chamadas REST.             |
| `VITE_SOCKET_URL`   | `https://api.kurio.test` | Endpoint do Socket.IO (interceptado pelo MSW). |
| `VITE_ENABLE_MOCKS` | `true`                   | Liga/desliga toda a camada de simulação.       |
| `VITE_MOCK_SEED`    | `20260917`               | Semente do gerador determinístico de fixtures. |

## Comandos

| Comando               | O que faz                                                     |
| --------------------- | ------------------------------------------------------------- |
| `npm run dev`         | Desenvolvimento com mocks.                                    |
| `npm run build`       | Typecheck + build de produção (mocks incluídos).              |
| `npm run preview`     | Serve o build de produção.                                    |
| `npm run typecheck`   | Checagem de tipos.                                            |
| `npm run lint`        | Lint (oxlint).                                                |
| `npm run format`      | Prettier.                                                     |
| `npm run test:e2e`    | Playwright (sobe o build automaticamente).                    |
| `npm run test:e2e:ui` | Playwright em modo interativo.                                |
| `npm run test:report` | Abre o relatório HTML do Playwright.                          |
| `npm run lighthouse`  | Auditoria Lighthouse (3 medições por página/perfil, mediana). |

## Credenciais fictícias

| Usuário       | E-mail             | Senha       |
| ------------- | ------------------ | ----------- |
| Ana Ribeiro   | `ana@kurio.test`   | `kurio2026` |
| Bruno Tavares | `bruno@kurio.test` | `kurio2026` |

Os dois existem para provar isolamento: têm carrinhos, favoritos, carteiras e
pedidos distintos. Nenhuma senha é armazenada em claro no navegador — elas vivem
apenas dentro do banco de dados simulado, que roda na mesma aba.

### Cupons

| Código      | Efeito                           |
| ----------- | -------------------------------- |
| `KURIO10`   | 10% de desconto                  |
| `GENESIS15` | 15% de desconto                  |
| `EXPIRADO`  | Sempre responde `COUPON_EXPIRED` |

## Cenários de simulação

Todo o comportamento da rede e das regras de negócio é controlado por
**cenários** nomeados e reproduzíveis. Há três formas de selecionar um:

1. **Pela URL** — `?scenario=slow-network` (fica salvo no `localStorage`).
2. **Pelo console** — `window.__kurio.setScenario('order-timeout')`.
3. **Por requisição** — cabeçalho `X-Mock-Scenario: offline`.

Para voltar ao estado conhecido: `window.__kurio.reset()` (ou
`POST /api/__mock__/reset`). O reset restaura integralmente o cenário semeado.

| Cenário            | O que exercita                                                        |
| ------------------ | --------------------------------------------------------------------- |
| `default`          | Fluxo feliz, latência curta.                                          |
| `instant`          | Sem latência — usado pelos testes E2E e pelo Lighthouse.              |
| `empty-results`    | Catálogo responde 200 com zero itens.                                 |
| `slow-network`     | 2,5 s de latência: skeletons e estados de carregamento.               |
| `variable-latency` | 120 ms–2,4 s com respostas fora de ordem.                             |
| `offline`          | Falha de conexão em todas as requisições.                             |
| `flaky-network`    | 35% de falhas entre conexão e 503.                                    |
| `server-error`     | 503 em todas as requisições.                                          |
| `session-expired`  | Sessão expira durante a navegação.                                    |
| `favorites-fail`   | Mutation de favoritos falha (rollback otimista).                      |
| `coupon-expired`   | Qualquer cupom responde expirado.                                     |
| `price-changed`    | Preço muda durante o checkout.                                        |
| `edition-sold-out` | Edição esgota durante o checkout.                                     |
| `order-timeout`    | Pedido é criado, resposta nunca chega (recuperação por idempotência). |
| `payment-declined` | Pedido termina recusado.                                              |
| `duplicate-events` | Eventos duplicados e com versão antiga.                               |

### Reproduzindo os fluxos de falha

```text
Catálogo vazio           → /?scenario=empty-results
Skeletons                → /?scenario=slow-network
Erro + recuperação       → /?scenario=server-error e clique em "Tentar de novo"
Rollback otimista        → entre na conta, /?scenario=favorites-fail e favorite um NFT
Cupom expirado           → carrinho, cupom EXPIRADO (ou ?scenario=coupon-expired)
Sessão expirada          → entre na conta, ?scenario=session-expired e vá a /conta/perfil
Preço muda no carrinho   → com item no carrinho, window.__kurio.setNftPrice('nft-001', '7.77')
Eventos duplicados       → ?scenario=duplicate-events e repita o passo acima
```

## Controle programático (`window.__kurio`)

Disponível sempre que os mocks estão ativos — é a superfície usada pelos testes
e pela demonstração:

```ts
window.__kurio.reset() // volta ao cenário semeado
window.__kurio.setScenario('payment-declined')
window.__kurio.getScenario()
window.__kurio.scenarios() // lista com rótulo e descrição
window.__kurio.setNftPrice('nft-001', '7.77') // muda preço e emite nft.updated
window.__kurio.setEditionAvailability('nft-001', 'ed-0-unique', 0)
window.__kurio.realtime.connectionCount()
window.__kurio.realtime.disconnectAll() // simula queda de conexão
window.__kurio.inspect() // verdade do servidor simulado
```

## Testes

```bash
npm run test:e2e                       # desktop (1440×900) e mobile (390×844)
npm run test:e2e -- --project=desktop-chromium
npm run test:report                    # relatório HTML
```

Cada teste parte de um banco recém-semeado no cenário `instant`, então a suíte é
determinística. Traces e vídeos ficam retidos apenas em falha.

## Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md) — contratos REST e de eventos, política de
  sessão, estado do carrinho, estratégia de cache, reconciliação REST ↔ Socket.IO,
  limitações e desvios do Figma.
- [docs/design-tokens.md](./docs/design-tokens.md) — origem de cada cor, tamanho
  e espaçamento extraídos do arquivo do Figma.
- [docs/assets.md](./docs/assets.md) — situação das imagens e substituições.
