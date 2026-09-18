# Componentes (shadcn/ui)

## O que está no repositório

shadcn/ui não é uma dependência: os componentes são **copiados para dentro do
projeto** e passam a ser código da aplicação. Eles vivem em `src/components/ui`,
com o `components.json` na raiz descrevendo estilo (`new-york`), ícones
(`lucide`) e os apelidos de import.

| Componente   | Primitivo           | Onde é usado                                            |
| ------------ | ------------------- | ------------------------------------------------------- |
| `Button`     | `react-slot` (cva)  | Todos os botões e os CTAs que são links (`asChild`)     |
| `Input`      | —                   | Todos os campos de texto, via `Field`                   |
| `Label`      | `react-label`       | Rótulos dos campos, do cupom e da carteira              |
| `Select`     | `react-select`      | Rede, tipo de carteira, domínio ENS, função da carteira |
| `Dialog`     | `react-dialog`      | Gaveta de navegação no mobile                           |
| `Checkbox`   | `react-checkbox`    | “Usar outra carteira?”                                  |
| `RadioGroup` | `react-radio-group` | Escolha da carteira no pagamento                        |
| `Tabs`       | `react-tabs`        | Detalhes / Avaliações na página do NFT                  |
| `Table`      | —                   | Itens do carrinho                                       |
| `Badge`      | `react-slot` (cva)  | Raridade, esgotado, estado da carteira                  |
| `Skeleton`   | —                   | Carregamentos                                           |

## Como os tokens do Figma entram

Nenhum componente carrega cor literal: todos usam os tokens semânticos
(`primary`, `accent`, `card`, `line`, `danger`, `ring`) definidos no `@theme` de
`src/styles/index.css`, que por sua vez saem do arquivo do Figma (ver
[design-tokens.md](./design-tokens.md)). Mudar o token muda o componente inteiro.

As variantes do `Button` (`default`, `outline`, `secondary`, `ghost`, `link`,
`danger`) e seus tamanhos (incluindo `pill`, para os controles redondos do
layout) foram escolhidas a partir dos botões que o Figma realmente usa.

## Ponte com o react-hook-form

O `Select` do shadcn/ui é um menu do Radix, não um `<select>` nativo: ele avisa a
mudança por callback, então não funciona com `register`. `FormSelect`
(`src/components/form-select.tsx`) envolve o componente em um `Controller` e
mantém `aria-label`, `aria-invalid` e `aria-describedby` — o `Field` continua
sendo quem amarra rótulo, erro e controle.

Esse arquivo fica fora de `components/ui` de propósito: `components/ui` é o
código do shadcn/ui, e o que é da aplicação fica ao lado.

## Duas exceções deliberadas

**O “Ordenar por” do catálogo continua nativo.** É o único campo das duas páginas
auditadas pelo Lighthouse, e um `<select>` do sistema dispensa cerca de 12 kB de
JavaScript no caminho crítico — além de abrir o seletor nativo no celular. O
`Select` do shadcn/ui é usado nos formulários, onde não pesa na medição e o menu
estilizado faz diferença.

**Os recortes do catálogo não são `Tabs` do Radix.** São filtros que vivem na URL
e não têm painéis: o `aria-controls` de cada aba apontaria para um elemento que
não existe, e o Lighthouse reprova (`aria-valid-attr-value`). A lista de abas ali
é escrita à mão, com `Button` do shadcn/ui por baixo. No detalhe do NFT, onde os
painéis existem de verdade, o `Tabs` é usado — com `forceMount` nos dois
conteúdos, justamente para que o `aria-controls` sempre resolva.

## Peso

O Radix custa cerca de 9 kB gzip no caminho crítico. O `Dialog` — o mais pesado
do conjunto, por causa da trava de rolagem e do portal — é carregado sob demanda,
no primeiro clique do menu (`mobile-nav.tsx`), e por isso não entra nesse número.
