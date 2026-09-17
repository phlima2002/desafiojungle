import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  displayName: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  bio: z.string(),
  createdAt: isoDateTimeSchema,
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  user: userSchema,
  /** Absolute expiry. The client proactively refreshes shortly before it. */
  expiresAt: isoDateTimeSchema,
})
export type Session = z.infer<typeof sessionSchema>

/**
 * `GET /session` answers 200 in every case and describes the state in the body.
 * Probing for a session is a normal read, not an error: answering 401 to an
 * anonymous visitor would log a browser error on every cold load and tell the
 * client nothing it cannot read here. 401 stays reserved for *protected*
 * resources, where it is a real authorisation failure.
 */
export const sessionStateSchema = z.discriminatedUnion('authenticated', [
  z.object({ authenticated: z.literal(true), user: userSchema, expiresAt: isoDateTimeSchema }),
  z.object({
    authenticated: z.literal(false),
    reason: z.enum(['anonymous', 'expired']),
  }),
])
export type SessionState = z.infer<typeof sessionStateSchema>

const passwordSchema = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres')
  .regex(/[a-zA-Z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

export const loginRequestSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
  remember: z.boolean(),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome'),
    email: z.email('Informe um e-mail válido'),
    password: passwordSchema,
    passwordConfirmation: z.string(),
    acceptedTerms: z.literal(true, { message: 'É preciso aceitar os termos' }),
  })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'As senhas não coincidem',
  })
export type RegisterRequest = z.infer<typeof registerRequestSchema>

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    newPasswordConfirmation: z.string(),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirmation, {
    path: ['newPasswordConfirmation'],
    message: 'As senhas não coincidem',
  })
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>
