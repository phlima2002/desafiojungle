import type { EthAmount } from '@/shared/api/contracts/common'

const WEI_DECIMALS = 18n
const WEI_PER_ETH = 10n ** WEI_DECIMALS

/**
 * ETH amounts are decimal strings end to end. Every sum, discount and
 * multiplication runs on BigInt wei so that 0.1 + 0.2 is exactly 0.3 and a
 * 18-decimal value never degrades into a float.
 */
export function toWei(amount: string): bigint {
  const trimmed = amount.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new TypeError(`Valor ETH inválido: "${amount}"`)
  }
  const negative = trimmed.startsWith('-')
  const [whole, fraction = ''] = (negative ? trimmed.slice(1) : trimmed).split('.')
  const padded = (fraction + '0'.repeat(Number(WEI_DECIMALS))).slice(0, Number(WEI_DECIMALS))
  const value = BigInt(whole) * WEI_PER_ETH + BigInt(padded || '0')
  return negative ? -value : value
}

export function fromWei(wei: bigint): EthAmount {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / WEI_PER_ETH
  const fraction = (abs % WEI_PER_ETH).toString().padStart(Number(WEI_DECIMALS), '0').replace(/0+$/, '')
  const text = fraction ? `${whole}.${fraction}` : `${whole}`
  return negative ? `-${text}` : text
}

export const addEth = (a: string, b: string): EthAmount => fromWei(toWei(a) + toWei(b))
export const subEth = (a: string, b: string): EthAmount => fromWei(toWei(a) - toWei(b))
export const mulEth = (a: string, quantity: number): EthAmount => fromWei(toWei(a) * BigInt(quantity))
export const sumEth = (values: readonly string[]): EthAmount =>
  fromWei(values.reduce((acc, v) => acc + toWei(v), 0n))

/** Applies an integer basis-point discount (e.g. 1500 = 15%), rounding down. */
export const percentOfEth = (a: string, basisPoints: number): EthAmount =>
  fromWei((toWei(a) * BigInt(Math.round(basisPoints))) / 10000n)

export const compareEth = (a: string, b: string): -1 | 0 | 1 => {
  const wa = toWei(a)
  const wb = toWei(b)
  return wa === wb ? 0 : wa > wb ? 1 : -1
}

/**
 * Presentation helper. The Figma layouts show two decimals for catalogue
 * prices; totals keep up to four so that network fees stay visible.
 */
export function formatEth(amount: string, { decimals = 2 }: { decimals?: number } = {}): string {
  const wei = toWei(amount)
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / WEI_PER_ETH
  const fractionDigits = (abs % WEI_PER_ETH).toString().padStart(Number(WEI_DECIMALS), '0')
  const shown = fractionDigits.slice(0, decimals)
  const body = decimals > 0 ? `${whole},${shown}` : `${whole}`
  return `${negative ? '-' : ''}${body}`
}

export const formatEthWithUnit = (amount: string, decimals?: number): string =>
  `${formatEth(amount, decimals === undefined ? {} : { decimals })} ETH`
