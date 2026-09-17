import { z } from 'zod'
import { userSchema } from './auth'

export const profileSchema = userSchema.extend({
  website: z.string(),
  location: z.string(),
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileRequestSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  displayName: z
    .string()
    .trim()
    .min(3, 'Use pelo menos 3 caracteres')
    .max(24, 'Use no máximo 24 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Use apenas letras, números, ponto, hífen ou underline'),
  email: z.email('Informe um e-mail válido'),
  bio: z.string().max(280, 'Máximo de 280 caracteres'),
  website: z.union([z.literal(''), z.url('Informe uma URL válida')]),
  location: z.string().max(60, 'Máximo de 60 caracteres'),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
