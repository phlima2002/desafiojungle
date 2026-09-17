import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'
import { networkSchema } from './nft'

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase', 'ledger'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const walletRoleSchema = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof walletRoleSchema>

export const ensTldSchema = z.enum(['.eth', '.box', '.crypto'])
export type EnsTld = z.infer<typeof ensTldSchema>

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** Shared by the wallet form and the checkout profile — the layout uses the same fields. */
const profileFields = {
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  network: networkSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  address: z.string().trim().min(1, 'Informe o endereço da carteira'),
  secondaryAddress: z.string().trim().optional(),
  provider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .min(4, 'O código de indicação tem pelo menos 4 caracteres')
    .max(24, 'Use no máximo 24 caracteres'),
  email: z.email('Informe um e-mail válido'),
  ensTld: ensTldSchema,
  ensName: z
    .string()
    .trim()
    .min(3, 'Informe o nome ENS')
    .regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
}

/** The address format depends on the chosen network, so it is checked together. */
function checkAddress(
  value: { network: z.infer<typeof networkSchema>; address: string },
  ctx: z.RefinementCtx,
): void {
  const valid =
    value.network === 'solana' ? SOLANA_ADDRESS.test(value.address) : EVM_ADDRESS.test(value.address)
  if (!valid) {
    ctx.addIssue({
      code: 'custom',
      path: ['address'],
      message:
        value.network === 'solana'
          ? 'Endereço Solana inválido'
          : 'Endereço inválido: use 0x seguido de 40 caracteres',
    })
  }
}

export const walletSchema = z.object({
  id: idSchema,
  label: z.string(),
  ...profileFields,
  role: walletRoleSchema,
  connected: z.boolean(),
  createdAt: isoDateTimeSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletInputSchema = z
  .object({
    label: z.string().trim().min(2, 'Informe um apelido para a carteira'),
    ...profileFields,
    role: walletRoleSchema,
  })
  .superRefine(checkAddress)
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletConnectionSchema = z.object({
  walletId: idSchema,
  status: z.enum(['connected', 'refused', 'disconnected']),
  connectedAt: isoDateTimeSchema.nullable(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

/**
 * Checkout profile. Same shape as the wallet form except for the identifier the
 * layout asks for (username instead of the wallet nickname) and the optional
 * note.
 */
export const collectorDetailsSchema = z
  .object({
    ...profileFields,
    username: z
      .string()
      .trim()
      .min(3, 'Use pelo menos 3 caracteres')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Use apenas letras, números, ponto, hífen ou underline'),
    note: z.string().trim().max(280, 'Máximo de 280 caracteres').optional(),
  })
  .superRefine(checkAddress)
export type CollectorDetails = z.infer<typeof collectorDetailsSchema>

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  ledger: 'Ledger',
}
