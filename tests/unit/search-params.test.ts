import { describe, expect, it } from 'vitest'
import { parseSearch, stringifySearch } from '../../src/app/search-serialization'

/**
 * A URL é a fonte da verdade do catálogo, e arrays viajam como chave repetida
 * (`categoria=arte-digital&categoria=fotografia`) tanto na API quanto no
 * endereço. Estes testes fixam esse contrato, que o TanStack Router não dá de
 * graça — o padrão dele é JSON na query string.
 */
describe('serialização dos search params', () => {
  it('ida e volta preserva escalares e arrays', () => {
    const search = { q: 'ape', tab: 'trending', categoria: ['arte-digital', 'fotografia'], pagina: '2' }
    expect(parseSearch(stringifySearch(search))).toEqual(search)
  })

  it('escreve chave repetida, não JSON', () => {
    const query = stringifySearch({ categoria: ['arte-digital', 'musica'] })
    expect(query).toContain('categoria=arte-digital')
    expect(query).toContain('categoria=musica')
    expect(query).not.toContain('[')
  })

  it('lê uma chave repetida como array e uma só como escalar', () => {
    expect(parseSearch('?categoria=arte-digital&categoria=musica').categoria).toEqual([
      'arte-digital',
      'musica',
    ])
    expect(parseSearch('?categoria=arte-digital').categoria).toBe('arte-digital')
  })

  // A conversão de tipo é responsabilidade do schema da rota
  // (`catalogSearchSchema`, com `z.coerce.number()`), não desta camada: aqui só
  // existe texto, como na própria URL. Um número devolvido daqui esconderia de
  // quem lê que `?pagina=abc` também chega como texto e precisa ser validado.
  it('devolve texto, deixando a conversão para o schema da rota', () => {
    expect(parseSearch('?pagina=3').pagina).toBe('3')
    expect(parseSearch('?pagina=abc').pagina).toBe('abc')
  })

  it('omite vazios em vez de sujar a URL', () => {
    expect(stringifySearch({})).toBe('')
    expect(stringifySearch({ q: undefined, categoria: [] })).toBe('')
  })

  it('preserva acentos e espaços', () => {
    const query = stringifySearch({ q: 'arte digital é rara' })
    expect(parseSearch(query).q).toBe('arte digital é rara')
  })

  it('descarta itens vazios dentro de um array', () => {
    expect(stringifySearch({ rede: ['ethereum', '', 'solana'] })).toBe('?rede=ethereum&rede=solana')
  })
})
