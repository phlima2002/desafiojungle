import { describe, expect, it } from 'vitest'
import {
  addEth,
  compareEth,
  formatEth,
  formatEthWithUnit,
  fromWei,
  mulEth,
  percentOfEth,
  subEth,
  sumEth,
  toWei,
} from '../../src/shared/lib/money'

/**
 * O desafio é explícito: valores em ETH viajam como string decimal e a precisão
 * não pode se perder. Estes testes existem para provar isso no ponto em que
 * seria fácil quebrar sem ninguém notar — a aritmética.
 */
describe('aritmética em wei', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
    // Em number, 0.1 + 0.2 === 0.30000000000000004.
    expect(Number('0.1') + Number('0.2')).not.toBe(0.3)
  })

  it('preserva as 18 casas decimais', () => {
    const wei = '0.000000000000000001'
    expect(addEth(wei, wei)).toBe('0.000000000000000002')
    expect(toWei(wei)).toBe(1n)
    expect(fromWei(1n)).toBe(wei)
  })

  it('não degrada valores grandes', () => {
    const big = '123456789.123456789123456789'
    expect(fromWei(toWei(big))).toBe(big)
  })

  it('subtrai, multiplica e soma listas', () => {
    expect(subEth('1', '0.000000000000000001')).toBe('0.999999999999999999')
    expect(mulEth('8.42', 3)).toBe('25.26')
    expect(sumEth(['0.1', '0.2', '0.3'])).toBe('0.6')
    expect(sumEth([])).toBe('0')
  })

  it('desconta em basis points arredondando para baixo', () => {
    expect(percentOfEth('10', 1000)).toBe('1')
    expect(percentOfEth('8.42', 1500)).toBe('1.263')
    // 1 wei com 15% não vira 0,15 wei: arredonda para baixo, e some.
    expect(percentOfEth('0.000000000000000001', 1500)).toBe('0')
  })

  it('compara sem converter para number', () => {
    expect(compareEth('0.1', '0.2')).toBe(-1)
    expect(compareEth('0.2', '0.1')).toBe(1)
    expect(compareEth('1.0', '1')).toBe(0)
    expect(compareEth('9007199254740993', '9007199254740992')).toBe(1)
  })

  it('aceita negativos (descontos sempre entram subtraindo)', () => {
    expect(subEth('0.1', '0.3')).toBe('-0.2')
    expect(addEth('-0.2', '0.2')).toBe('0')
  })

  it('recusa entrada fora do formato', () => {
    for (const bad of ['', 'abc', '1,5', '1.2.3', ' 1 2 ', '0x10', 'NaN', 'Infinity']) {
      expect(() => toWei(bad)).toThrow(TypeError)
    }
    // Espaço em volta é tolerado de propósito: valores vêm de JSON e de inputs.
    expect(toWei(' 1.5 ')).toBe(1_500_000_000_000_000_000n)
  })
})

describe('formatação pt-BR', () => {
  it('usa vírgula decimal e trunca, nunca arredonda para cima', () => {
    expect(formatEth('8.429')).toBe('8,42')
    expect(formatEth('8.4')).toBe('8,40')
    expect(formatEth('0.0042', { decimals: 4 })).toBe('0,0042')
    expect(formatEth('12', { decimals: 0 })).toBe('12')
  })

  it('acrescenta a unidade sem mexer no número', () => {
    expect(formatEthWithUnit('8.42')).toBe('8,42 ETH')
    expect(formatEthWithUnit('0.0042', 4)).toBe('0,0042 ETH')
  })

  it('mantém o sinal negativo', () => {
    expect(formatEth('-1.5')).toBe('-1,50')
  })
})
