import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  collectorDetailsSchema,
  ethAmountSchema,
  walletInputSchema,
} from '../../src/shared/api/contracts'

/**
 * Os contratos em Zod são o ponto em que a aplicação decide o que aceita — na
 * entrada do formulário e na saída da rede. O que está testado aqui é o que não
 * dá para ver olhando a tela: por que um endereço é recusado e com qual
 * mensagem, e que o envelope de erro tem forma única.
 */
const VALID_WALLET = {
  label: 'Carteira principal',
  displayName: 'Ana Ribeiro',
  network: 'ethereum',
  profileName: 'Ana Ribeiro',
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  provider: 'metamask',
  referralCode: 'KURIO-ANA1',
  email: 'ana@kurio.test',
  ensTld: '.eth',
  ensName: 'anaribeiro',
  role: 'primary',
} as const

describe('carteira', () => {
  it('aceita um cadastro completo', () => {
    expect(walletInputSchema.safeParse(VALID_WALLET).success).toBe(true)
  })

  it('valida o endereço conforme a rede escolhida', () => {
    const evmOnSolana = walletInputSchema.safeParse({ ...VALID_WALLET, network: 'solana' })
    expect(evmOnSolana.success).toBe(false)
    expect(evmOnSolana.error?.issues[0]?.message).toContain('Solana')

    const solanaAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    expect(
      walletInputSchema.safeParse({ ...VALID_WALLET, network: 'solana', address: solanaAddress }).success,
    ).toBe(true)
    // Base58 não tem O, I, l nem 0 — um endereço com eles é recusado.
    expect(
      walletInputSchema.safeParse({
        ...VALID_WALLET,
        network: 'solana',
        address: '0OIl'.padEnd(40, 'x'),
      }).success,
    ).toBe(false)
  })

  it('aponta o erro no campo do endereço, não no formulário inteiro', () => {
    const result = walletInputSchema.safeParse({ ...VALID_WALLET, address: '0x123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['address'])
  })

  it('recusa e-mail, código de indicação e ENS fora do formato', () => {
    const bad = [
      { email: 'ana@' },
      { referralCode: 'abc' },
      { referralCode: 'x'.repeat(25) },
      { ensName: 'ana ribeiro' },
      { ensTld: '.sol' },
      { displayName: 'A' },
    ]
    for (const patch of bad) {
      expect(walletInputSchema.safeParse({ ...VALID_WALLET, ...patch }).success).toBe(false)
    }
  })
})

describe('perfil do colecionador', () => {
  const { label: _label, role: _role, ...shared } = VALID_WALLET
  const VALID_COLLECTOR = { ...shared, username: 'anaribeiro' }

  it('usa nome de usuário no lugar do apelido da carteira', () => {
    expect(collectorDetailsSchema.safeParse(VALID_COLLECTOR).success).toBe(true)
    expect(collectorDetailsSchema.safeParse({ ...VALID_COLLECTOR, username: 'an' }).success).toBe(false)
    expect(collectorDetailsSchema.safeParse({ ...VALID_COLLECTOR, username: 'ana ribeiro' }).success).toBe(
      false,
    )
  })

  it('limita a observação a 280 caracteres', () => {
    expect(collectorDetailsSchema.safeParse({ ...VALID_COLLECTOR, note: 'x'.repeat(280) }).success).toBe(true)
    expect(collectorDetailsSchema.safeParse({ ...VALID_COLLECTOR, note: 'x'.repeat(281) }).success).toBe(
      false,
    )
  })

  it('herda a mesma validação de endereço da carteira', () => {
    const result = collectorDetailsSchema.safeParse({ ...VALID_COLLECTOR, address: 'nope' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['address'])
  })
})

describe('valor em ETH', () => {
  it('aceita decimal em string, até 18 casas', () => {
    for (const good of ['0', '8.42', '0.000000000000000001', '123456789.1']) {
      expect(ethAmountSchema.safeParse(good).success).toBe(true)
    }
  })

  it('recusa o que abriria porta para float e para locale', () => {
    for (const bad of ['8,42', '.5', '1e18', '-1', '0.0000000000000000001', 8.42]) {
      expect(ethAmountSchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe('envelope de erro', () => {
  it('aceita a forma mínima e a completa', () => {
    expect(
      apiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'não encontrado' } }).success,
    ).toBe(true)
    expect(
      apiErrorSchema.safeParse({
        error: {
          code: 'PRICE_CHANGED',
          message: 'O preço mudou.',
          details: [{ field: 'email', code: 'conflict', message: 'já usado' }],
          meta: { nftId: 'nft-001', price: '7.77' },
          requestId: 'req_1',
        },
      }).success,
    ).toBe(true)
  })

  it('recusa um código que não existe', () => {
    expect(apiErrorSchema.safeParse({ error: { code: 'BOOM', message: 'x' } }).success).toBe(false)
  })
})
