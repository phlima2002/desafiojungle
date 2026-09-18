import { describe, expect, it } from 'vitest'
import { pageWindow } from '../../src/features/catalog/search-params'

/**
 * A janela da paginação: o layout mostra quatro páginas e recolhe o resto. O
 * que estes testes fixam é o que não pode mudar sem quebrar a navegação — a
 * página atual sempre aparece, a primeira e a última sempre são alcançáveis, e
 * o número de botões não cresce com o catálogo.
 */
describe('pageWindow', () => {
  it('lista tudo enquanto cabe', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('recolhe o fim quando começa no início', () => {
    expect(pageWindow(1, 14)).toEqual([1, 2, 3, 4, null, 14])
  })

  it('recolhe os dois lados no meio', () => {
    expect(pageWindow(8, 14)).toEqual([1, null, 7, 8, 9, 10, null, 14])
  })

  it('recolhe o início quando chega ao fim', () => {
    expect(pageWindow(14, 14)).toEqual([1, null, 11, 12, 13, 14])
  })

  it('mostra sempre a página atual, a primeira e a última', () => {
    for (let total = 1; total <= 20; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const pages = pageWindow(current, total)
        expect(pages, `atual=${current} total=${total}`).toContain(current)
        expect(pages).toContain(1)
        expect(pages).toContain(total)
        // Quatro números da janela, mais a primeira e a última, mais duas
        // reticências: nunca mais do que isso, qualquer que seja o catálogo.
        expect(pages.length).toBeLessThanOrEqual(8)
      }
    }
  })

  it('não repete páginas', () => {
    for (let current = 1; current <= 14; current += 1) {
      const numbers = pageWindow(current, 14).filter((page): page is number => page !== null)
      expect(new Set(numbers).size).toBe(numbers.length)
    }
  })
})
