import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'
import { networkSchema } from './nft'

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase', 'ledger'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const walletRoleSchema = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof walletRoleSchema>

export const walletSchema = z.object({
  id: idSchema,
  label: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string(),
  role: walletRoleSchema,
  connected: z.boolean(),
  createdAt: isoDateTimeSchema,
})
export type Wallet = z.infer<typeof walletSchema>

const evmAddress = /^0x[a-fA-F0-9]{40}$/
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const walletInputSchema = z
  .object({
    label: z.string().trim().min(2, 'Informe um apelido para a carteira'),
    provider: walletProviderSchema,
    network: networkSchema,
    address: z.string().trim().min(1, 'Informe o endereço da carteira'),
    role: walletRoleSchema,
  })
  .superRefine((value, ctx) => {
    const ok = value.network === 'solana' ? solanaAddress.test(value.address) : evmAddress.test(value.address)
    if (!ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message:
          value.network === 'solana'
            ? 'Endereço Solana inválido'
            : 'Endereço inválido: use o formato 0x seguido de 40 caracteres',
      })
    }
  })
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletConnectionSchema = z.object({
  walletId: idSchema,
  status: z.enum(['connected', 'refused', 'disconnected']),
  connectedAt: isoDateTimeSchema.nullable(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>
