import { z } from 'zod'
import { userSchema } from './auth'
import { ensTldSchema } from './wallets'

export const profileSchema = userSchema.extend({
  username: z.string(),
  ensTld: ensTldSchema,
  ensName: z.string(),
  walletLabel: z.string(),
})
export type Profile = z.infer<typeof profileSchema>

/** Mirrors the fields the profile screen shows, in the same order. */
export const updateProfileRequestSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: z
    .string()
    .trim()
    .min(3, 'Use pelo menos 3 caracteres')
    .max(24, 'Use no máximo 24 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Use apenas letras, números, ponto, hífen ou underline'),
  email: z.email('Informe um e-mail válido'),
  ensTld: ensTldSchema,
  ensName: z
    .string()
    .trim()
    .min(3, 'Informe o nome ENS')
    .regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
  walletLabel: z.string().trim().min(2, 'Informe o apelido da carteira'),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
