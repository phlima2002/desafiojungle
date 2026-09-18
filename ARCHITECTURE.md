# Arquitetura

## Sumário

- [Organização](#organização)
- [Contratos REST](#contratos-rest)
- [Modelo de erro](#modelo-de-erro)
- [Política de sessão](#política-de-sessão)
- [Estado do carrinho](#estado-do-carrinho)
- [Cotação, idempotência e pedidos](#cotação-idempotência-e-pedidos)
- [Estratégia de cache](#estratégia-de-cache)
- [Tempo real e reconciliação](#tempo-real-e-reconciliação)
- [Camada de mocks](#camada-de-mocks)
- [Primeira pintura: shell e handoff](#primeira-pintura-shell-e-handoff)
- [Precisão monetária](#precisão-monetária)
- [Componentes](#componentes)
- [Acessibilidade](#acessibilidade)
- [Limitações conhecidas](#limitações-conhecidas)
- [Desvios em relação ao Figma](#desvios-em-relação-ao-figma)

## Organização

```
src/
  app/          providers, router, query client, guards, shell de build e handoff
  components/
    ui/         componentes do shadcn/ui (código do projeto, não dependência)
  routes/       rotas file-based do TanStack Router
  features/     um diretório por domínio (catalog, cart, checkout, session, …)
  shared/
    api/        contratos (zod), cliente Axios, endpoints, query keys, erros
    lib/        utilidades puras (money, cn)
    config/     leitura de variáveis de ambiente
  mocks/        banco simulado, fixtures, handlers REST, servidor Socket.IO, cenários
tests/e2e/      Playwright
```

A regra de dependência é de fora para dentro: `features` usa `shared` e
`components`, `shared` não conhece `features`, e `mocks` só depende de `shared/api/contracts` — o mesmo
contrato que a aplicação consome. Nenhum componente, hook ou interceptor do Axios
contém resposta fictícia ou caminho alternativo de negócio; toda a simulação vive
na camada de rede.

## Contratos REST

Todos os contratos são declarados uma única vez em `src/shared/api/contracts/`
com Zod, e os tipos TypeScript são inferidos deles. O mesmo schema:

1. tipa a função de endpoint,
2. **valida a resposta** antes que ela entre no cache (`request()` em
   `shared/api/client.ts`),
3. tipa os handlers do MSW.

Uma resposta fora do contrato falha alto em desenvolvimento e vira
`INTERNAL_ERROR` em produção — nunca contamina o cache com forma desconhecida.

| Recurso   | Operação               | Endpoint                                                                    |
| --------- | ---------------------- | --------------------------------------------------------------------------- |
| Sessão    | Consulta               | `GET /session`                                                              |
|           | Login                  | `POST /session`                                                             |
|           | Logout                 | `DELETE /session`                                                           |
| Conta     | Cadastro               | `POST /accounts`                                                            |
| NFTs      | Listagem               | `GET /nfts?q&tab&category[]&network[]&priceMin&priceMax&sort&page&pageSize` |
|           | Detalhe                | `GET /nfts/:idOrSlug`                                                       |
|           | Destaques              | `GET /nfts/featured`                                                        |
| Favoritos | Consulta               | `GET /favorites`                                                            |
|           | Inclusão               | `PUT /favorites/:nftId`                                                     |
|           | Remoção                | `DELETE /favorites/:nftId`                                                  |
| Carrinho  | Consulta               | `GET /cart`                                                                 |
|           | Inclusão               | `POST /cart/items`                                                          |
|           | Alteração              | `PATCH /cart/items/:itemId`                                                 |
|           | Remoção                | `DELETE /cart/items/:itemId`                                                |
|           | Cupom                  | `POST /cart/coupon` · `DELETE /cart/coupon`                                 |
| Cotação   | Criação                | `POST /quotes`                                                              |
|           | Consulta               | `GET /quotes/:quoteId`                                                      |
| Pedidos   | Criação idempotente    | `POST /orders` + `Idempotency-Key`                                          |
|           | Consulta               | `GET /orders/:orderId`                                                      |
| Perfil    | Consulta / atualização | `GET /profile` · `PATCH /profile`                                           |
|           | Avatar                 | `POST /profile/avatar` (multipart)                                          |
|           | Senha                  | `POST /profile/password`                                                    |
| Carteiras | Consulta / cadastro    | `GET /wallets` · `POST /wallets`                                            |
|           | Atualização            | `PUT /wallets/:walletId`                                                    |
|           | Conexão                | `POST /wallets/:id/connection` · `DELETE /wallets/:id/connection`           |

Os parâmetros da listagem são exatamente os que aparecem na URL da aplicação
(traduzidos de `categoria`/`rede`/`ordenar`/`pagina` para os nomes da API em
`endpoints/nfts.ts`), e a resposta ecoa `appliedQuery` com o que o servidor de
fato aplicou. Arrays viajam como chaves repetidas
(`category=arte-digital&category=fotografia`) tanto na API quanto na URL —
`app/search-serialization.ts` substitui a serialização JSON padrão do TanStack
Router para que as duas coincidam e o endereço continue legível.

## Modelo de erro

Toda resposta de erro tem a mesma forma:

```jsonc
{
  "error": {
    "code": "PRICE_CHANGED", // discriminador estável
    "message": "O preço de \"…\" mudou.",
    "details": [{ "field": "email", "code": "conflict", "message": "…" }],
    "meta": { "nftId": "nft-001", "price": "7.77" },
    "requestId": "…",
  },
}
```

O interceptor do Axios normaliza **qualquer** falha — HTTP, rede, timeout,
violação de contrato — na classe `ApiError`, com `code`, `status`, `details`
(prontos para `setError` do react-hook-form) e `isTransient`. É o único tipo de
erro que a interface precisa conhecer.

Códigos: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `SESSION_EXPIRED`, `FORBIDDEN`,
`NOT_FOUND`, `CONFLICT`, `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`,
`COUPON_INVALID`, `COUPON_EXPIRED`, `QUOTE_STALE`, `PRICE_CHANGED`,
`EDITION_SOLD_OUT`, `INSUFFICIENT_AVAILABILITY`, `IDEMPOTENCY_KEY_REUSED`,
`ORDER_ALREADY_FINALIZED`, `PAYMENT_DECLINED`, `WALLET_CONNECTION_REFUSED`,
`RATE_LIMITED`, `TRANSIENT_FAILURE`, `INTERNAL_ERROR`.

## Política de sessão

A sessão é um **cookie** (`kurio_session`, `SameSite=Lax`) emitido pelo servidor
simulado; o cliente nunca manipula o token. Visitantes recebem um segundo cookie
(`kurio_guest`) que dá identidade ao carrinho anônimo.

`GET /session` responde **200 em todos os casos** e descreve o estado no corpo:

```jsonc
{ "authenticated": true,  "user": { … }, "expiresAt": "…" }
{ "authenticated": false, "reason": "anonymous" }
{ "authenticated": false, "reason": "expired" }
```

Consultar se existe sessão é uma leitura normal, não um erro: responder 401 a um
visitante registraria um erro de console em todo carregamento (e custaria pontos
de _Best Practices_) sem informar nada que o corpo não informe. O 401 fica
reservado para recursos **protegidos**, onde é uma falha real de autorização — e
aí a distinção entre `UNAUTHENTICATED` e `SESSION_EXPIRED` permite oferecer a
retomada do contexto.

- **Recuperação após refresh:** o cookie sobrevive; o guard resolve a sessão pelo
  mesmo cache que os componentes leem, então nenhuma tela privada pisca antes de
  saber quem é o usuário.
- **Expiração durante a navegação:** o guard redireciona para `/entrar` com
  `?redirect=<destino>`; ao autenticar, o colecionador volta exatamente para onde
  estava, inclusive no meio do checkout.
- **Expiração durante uma mutation:** o interceptor emite `onSessionExpired`, os
  providers limpam a consulta de sessão e o próximo guard assume.
- **Logout e troca de usuário:** todo o cache privado é **removido** (não apenas
  invalidado) e o estado anônimo é escrito diretamente. Refazer `GET /session`
  nesse instante competiria com o `Set-Cookie` que apaga a sessão e poderia
  ressuscitar o usuário anterior por um frame. O socket também é destruído e
  recriado, descartando assinaturas e versões da sessão anterior.

## Estado do carrinho

O carrinho vive no servidor simulado; o cliente nunca calcula totais. O que ele
guarda por item é a quantidade e o **preço no momento em que o item foi
adicionado** — é isso que permite dizer “mudou de X para Y” em vez de reprecificar
silenciosamente.

- **Visitante → autenticado:** no login o carrinho do visitante é fundido ao da
  conta; quantidades são somadas e limitadas ao que ainda existe, então nada
  desaparece sem aviso.
- **Persistência:** o carrinho sobrevive a refresh porque vive no banco simulado
  (persistido em `localStorage`) e é identificado por cookie.
- **Disponibilidade:** cada linha carrega `available`, `maxPerOrder` e
  `unavailable`; a UI limita o stepper e destaca o que passou a não caber.
- **Mudanças em tempo real:** um `nft.updated` invalida o carrinho — quem recalcula
  desconto e taxa é o servidor.

## Cotação, idempotência e pedidos

O checkout tem dois passos deliberados:

1. `POST /quotes` devolve uma **cotação** — preços, cupom, taxas, total,
   `problems[]` (preço alterado, esgotado, disponibilidade reduzida), uma
   `fingerprint` do conteúdo e um `expiresAt`.
2. `POST /orders` envia `quoteId` + `quoteFingerprint` + `Idempotency-Key`.

Regras:

- Se a fingerprint não bate ou a cotação expirou → `QUOTE_STALE`: a interface
  mostra o que mudou e **exige nova confirmação**.
- Antes de confirmar, o servidor revalida preço e disponibilidade contra o
  catálogo vivo → `PRICE_CHANGED` / `EDITION_SOLD_OUT` com `meta`.
- **Mesma chave + mesmo conteúdo** devolve o mesmo pedido (200), nunca um
  segundo. **Mesma chave + conteúdo diferente** → `IDEMPOTENCY_KEY_REUSED` (409).
- O pedido nasce `pending`; a simulação o leva a `confirmed` ou `declined` e
  emite `order.updated`. A tela de confirmação também faz polling enquanto o
  estado for `pending`, então ela se recupera mesmo se o evento se perder.
- Em falha, os itens permanecem no carrinho. Após a confirmação, **apenas os
  itens e quantidades comprados** saem dele.
- O recibo é um snapshot: mudanças posteriores no catálogo não alteram seus
  valores.

## Estratégia de cache

Definida em um lugar só — `shared/api/query-keys.ts` (`cachePolicy`) e
`app/query-client.ts`.

| Dado             | `staleTime` | `gcTime` | Observação                              |
| ---------------- | ----------- | -------- | --------------------------------------- |
| Catálogo         | 30 s        | 5 min    | `keepPreviousData` na paginação/filtros |
| Detalhe          | 60 s        | 10 min   | Atualizado no lugar por evento          |
| Sessão           | 60 s        | 30 min   | `refetchOnWindowFocus`                  |
| Carrinho         | 0           | 5 min    | Sempre revalida ao montar               |
| Favoritos        | 30 s        | 10 min   | Mutation otimista                       |
| Pedido           | 0           | 30 min   | Polling enquanto `pending`              |
| Perfil/carteiras | 60 s        | 10 min   |                                         |

- **Isolamento por usuário:** toda chave privada é namespaced pelo id do dono
  (`['cart', userId]`). Dois colecionadores não compartilham entrada de cache, e
  trocar de usuário é uma troca de chave — não uma invalidação manual.
- **Retry:** só erros transitórios (`status 0`, `5xx`, `TRANSIENT_FAILURE`), no
  máximo 2 vezes, com backoff exponencial. Um `4xx` é uma decisão do servidor;
  repeti-lo esconderia o problema. Mutations **não** têm retry automático — a
  única segura de repetir é a de pedido, que repete explicitamente com sua chave
  de idempotência.
- **Cancelamento:** todas as queries recebem o `AbortSignal` do TanStack Query e
  o repassam ao Axios. Trocar de página ou de filtro cancela a requisição
  anterior, então uma resposta fora de ordem nunca sobrescreve uma mais nova. O
  cenário `variable-latency` existe para exercitar isso.
- **Atualização otimista:** favoritar é a interação de referência — o coração
  vira na hora, todas as views em cache daquele NFT são corrigidas e, em caso de
  falha, os snapshots anteriores de **todas** elas são restaurados. A quantidade
  no carrinho também é otimista, sempre liquidando no total que o servidor
  devolve.

## Tempo real e reconciliação

O transporte é Socket.IO de verdade: `socket.io-client` abre um WebSocket, faz o
handshake Engine.IO e decodifica frames Socket.IO. O servidor é
`@mswjs/socket.io-binding` sobre o interceptor WebSocket do MSW — nada na
aplicação é ignorado ou substituído por chamadas diretas a setters.

### Eventos

| Evento          | Carga                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `nft.updated`   | `eventId`, `resourceId`, `version`, `emittedAt`, `audienceUserId`, `price`, `compareAtPrice`, `available`, `editions[]`        |
| `order.updated` | `eventId`, `resourceId`, `version`, `emittedAt`, `audienceUserId`, `status`, `transactionHash`, `explorerUrl`, `declineReason` |

Do cliente para o servidor: `client.identify`, `client.subscribe`,
`client.unsubscribe`.

### Garantias

- **Duplicatas** são descartadas por `eventId`.
- **Eventos antigos** são descartados comparando `version` com a última aplicada
  por recurso; o estado nunca regride nem reaplica efeito.
- **Isolamento:** `audienceUserId` diferente do usuário atual → evento ignorado.
  Além disso, o cliente é destruído e recriado a cada troca de usuário.
- **Ciclo de vida:** assinaturas são feitas por componente e liberadas ao
  desmontar; `destroy()` remove listeners, limpa versões e fecha o socket.
- **Reconexão:** ao reconectar, o cliente reenvia as assinaturas e **reconcilia
  via REST** (invalida catálogo, carrinho e pedidos), porque eventos emitidos
  durante a queda se perderam. O servidor simulado também reenvia o estado atual
  de tudo que acabou de ser assinado.

### O cenário exigido

1. Um NFT está no carrinho.
2. `window.__kurio.setNftPrice('nft-001', '7.77')` altera preço/disponibilidade.
3. O carrinho mostra um aviso (`role="status"`) e o resumo é recalculado pelo
   servidor.
4. O checkout recusa confirmar com cotação desatualizada (`QUOTE_STALE`).

Interrupção de conexão com pedido pendente: `window.__kurio.realtime.disconnectAll()`
derruba o socket; ao reconectar ou recarregar, a tela de confirmação recupera o
estado pelo `GET /orders/:id` e pela chave de idempotência — sem criar outra
compra. Pedidos `confirmed` e `declined` são terminais.

## Camada de mocks

- **Banco simulado** (`src/mocks/db`): usuários, sessões, catálogo, favoritos,
  carrinhos, cotações, pedidos, carteiras e cupons, persistido em `localStorage`
  para sobreviver a refresh. `reset()` restaura integralmente o cenário semeado.
  A escrita é **síncrona**: um debounce ali abria uma janela em que um refresh
  logo após uma mutação lia o estado anterior — o carrinho se esvaziando no F5.
- **Fixtures determinísticas:** 126 NFTs gerados por um PRNG com semente
  (`mulberry32`), com variedade suficiente para 9 categorias, 3 redes, faixas de
  preço, edições 1/1, limitadas e abertas, itens esgotados e itens escassos.
  Dois usuários com dados próprios.
- **Condições de rede:** latência fixa ou variável, respostas fora de ordem,
  falha de conexão, 4xx/5xx, timeout que nunca responde — tudo configurável por
  cenário e reproduzível.
- **Ativação:** `VITE_ENABLE_MOCKS`. A camada faz parte do build de demonstração.
- **Consistência:** uma alteração no catálogo passa por `mutateNft()`, que
  recalcula disponibilidade, incrementa a versão e emite o evento — então REST e
  Socket.IO nunca divergem.

## Primeira pintura: shell e handoff

Um SPA client-side não pinta nada antes do bundle. Para as duas rotas auditadas,
o build injeta ao lado de `#root` a marcação da primeira dobra
(`src/app/static-shell.ts`) — cabeçalho em todas as rotas, headline e arte na
home, trilha e galeria no detalhe —, e `#root` nasce oculto.

Trocar o shell pelo React poderia trazer o problema de volta por outro caminho:
a arte já visível sumiria, daria lugar a um skeleton e voltaria depois. Por isso
quem desenha a primeira dobra **não mostra skeleton onde o shell já mostra
conteúdo** — `HomeHero` usa a imagem que veio no documento enquanto a query de
destaques não responde, e `NftDetailSkeleton` deriva a arte do slug. O handoff
(`src/app/shell-handoff.ts`) acontece no primeiro commit do React, sem timer e
sem estado compartilhado: remove o shell e revela `#root`.

Não há temporizador forçando a troca. Se o bundle nunca subir, o shell ficar de
pé é a falha melhor — revelar um `#root` vazio trocaria um cabeçalho e uma obra
por uma tela em branco.

O que mantém a duplicação honesta são os testes: `tests/e2e/shell.spec.ts`
compara título, arte principal e miniaturas do shell com o que a aplicação
renderiza, em mais de um slug, e verifica que o shell não sobrevive à montagem.
Números e decisões em [docs/performance.md](./docs/performance.md).

## Precisão monetária

Valores em ETH trafegam como **strings decimais** e toda aritmética acontece em
`BigInt` (wei, 18 casas) em `shared/lib/money.ts`. Nenhum valor monetário vira
`number` em momento algum: soma, desconto (em _basis points_) e multiplicação por
quantidade são exatos. A formatação é separada do cálculo e usa vírgula decimal
(pt-BR). Quantidades são inteiras.

## Componentes

A camada de componentes é o **shadcn/ui**: os arquivos são copiados para
`src/components/ui` e passam a ser código do projeto, sobre os primitivos do
Radix. Nenhum deles carrega cor literal — todos usam os tokens semânticos do
`@theme`, que saem do Figma.

O que isso resolve na prática: foco preso e devolvido na gaveta de navegação,
`aria-selected`/`aria-controls` corretos nas abas, rádio e checkbox operáveis por
teclado, e um único lugar para mudar a aparência de todos os botões.
`FormSelect` faz a ponte com o react-hook-form, que precisa de `Controller` para
um menu do Radix. Detalhes, tabela de uso e as duas exceções deliberadas estão em
[docs/components.md](./docs/components.md).

## Acessibilidade

- Marco de navegação com _skip link_, `<main id="conteudo">` e um único `h1` por
  página.
- Foco visível global (`:focus-visible`) com contraste sobre o fundo escuro.
- Campos com `<label>` associado, `aria-invalid` e `aria-describedby` apontando
  para a mensagem de erro (componente `Field`).
- Estados de carregamento anunciados com `aria-busy`/`aria-live`; erros com
  `role="alert"`; confirmações com `role="status"`.
- Skeletons preservam as dimensões do conteúdo e respeitam
  `prefers-reduced-motion` (viram um tom estático).
- Alternativas textuais descritivas em todas as imagens do catálogo.
- Estados nunca dependem só de cor (esgotado tem rótulo, favorito tem
  `aria-pressed`, aba ativa tem `aria-selected`).

## Limitações conhecidas

- **Transporte Socket.IO nos mocks:** apenas o namespace padrão `/`;
  `transports` precisa ser `['websocket']` (não há fallback de long-polling);
  _rooms_, _broadcast_ nativo e _acks_ não são implementados pelo binding. O
  keep-alive Engine.IO é emitido manualmente pelo servidor simulado a cada 20 s,
  sem o qual o cliente derrubaria a conexão.
- **Ordem de importação:** `engine.io-client` captura `globalThis.WebSocket` no
  momento em que seu módulo é avaliado. Por isso o cliente Socket.IO é importado
  **dinamicamente**, já com o worker de pé, e o `manualChunks` do Vite o mantém
  fora do chunk de mocks. Sem isso o socket escaparia para a rede real.
- **Persistência:** o banco simulado vive em `localStorage`, logo é por navegador
  e por origem. Em aba anônima com armazenamento bloqueado ele funciona apenas em
  memória.
- **Shell acoplado ao seed:** o shell estático deriva a arte da primeira dobra do
  token do slug, o mesmo índice que o seed usa. Com um backend real isso seria o
  documento renderizado no servidor; aqui é uma derivação, guardada por testes
  (`tests/e2e/shell.spec.ts`) que comparam o que o shell mostra com o que a
  aplicação renderiza.
- **Sem renderização no servidor:** a aplicação é client-side. O shell cobre a
  primeira dobra das duas rotas auditadas; as demais pintam o cabeçalho e depois
  o conteúdo do React.
- **Publicação em subcaminho:** funciona (`VITE_BASE=/repo/`, que é como o
  GitHub Pages serve), mas o `VITE_API_BASE_URL` passa a ser `/repo/api` — o
  service worker do MSW só intercepta dentro do próprio escopo. Com um backend
  real em outro domínio isso não se aplica.

## Desvios em relação ao Figma

- **Contagens dos filtros:** o layout mostra números fixos por coleção
  (33, 12, 65, …) que não fecham com os números por rede (119, 78, 86). Preferi
  renderizar as contagens **reais** do conjunto de dados — um filtro que mente
  sobre quantos itens vai trazer é pior do que um número diferente do mockup.
- **Tipografia do herói:** o título usa 43 px/70 px no frame desktop. Em uma
  fonte monoespaçada isso estoura um viewport de 390 px, então o tamanho é fluido
  (`clamp(1.75rem, 6.2vw, 2.6875rem)`), chegando ao valor do Figma a partir de
  ~700 px.
- **Ícones sociais do rodapé:** o layout traz os logotipos das redes. O pacote de
  ícones usado não tem ícones de marca, e reproduzir logotipos de terceiros não é
  apropriado num teste técnico — as posições ficam com lettermarks neutras, com o
  mesmo tamanho e a mesma área de clique.
- **Imagens:** as quatro ilustrações são as do Figma, reencodadas em WebP 512 px;
  ver [docs/assets.md](./docs/assets.md).
