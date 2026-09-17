import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import { loginRequestSchema, registerRequestSchema, type FieldError } from '@/shared/api/contracts'
import {
  createSession,
  db,
  destroySession,
  expireSessions,
  findSession,
  findUserByEmail,
  mergeGuestCart,
  persist,
} from '../db'
import type { MockUser } from '../db/types'
import { applyNetworkConditions, errorResponse, scenarioFor } from '../network'
import { clearedSessionCookie, readContext, sessionCookie, type Cookies } from './context'

const base = env.apiBaseUrl

function publicUser(user: MockUser) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
  }
}

function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string; code: string }>): FieldError[] {
  return issues.map((issue) => ({
    field: issue.path.map(String).join('.') || 'form',
    code: issue.code,
    message: issue.message,
  }))
}

export const sessionHandlers = [
  http.get(`${base}/session`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const scenario = scenarioFor(request)
    if (scenario.sessionExpired) expireSessions()

    const context = readContext(cookies as Cookies)
    if (context.expired) {
      return HttpResponse.json({ authenticated: false, reason: 'expired' })
    }
    if (!context.user) {
      return HttpResponse.json({ authenticated: false, reason: 'anonymous' })
    }

    const session = findSession(context.token ?? undefined)
    return HttpResponse.json({
      authenticated: true,
      user: publicUser(context.user),
      expiresAt: session?.expiresAt ?? new Date(Date.now() + 60_000).toISOString(),
    })
  }),

  http.post(`${base}/session`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const parsed = loginRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Confira os campos destacados.', {
        details: toFieldErrors(parsed.error.issues),
      })
    }

    const user = findUserByEmail(parsed.data.email)
    if (!user || user.password !== parsed.data.password) {
      return errorResponse('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }

    const { token, expiresAt } = createSession(user.id)
    const context = readContext(cookies as Cookies)
    mergeGuestCart(user.id, context.guestId)

    return HttpResponse.json(
      { user: publicUser(user), expiresAt },
      { headers: { 'Set-Cookie': sessionCookie(token, expiresAt) } },
    )
  }),

  http.post(`${base}/accounts`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const parsed = registerRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Confira os campos destacados.', {
        details: toFieldErrors(parsed.error.issues),
      })
    }

    if (findUserByEmail(parsed.data.email)) {
      return errorResponse('EMAIL_ALREADY_REGISTERED', 'Este e-mail já possui uma conta na Kurio.', {
        details: [{ field: 'email', code: 'conflict', message: 'E-mail já cadastrado' }],
      })
    }

    const user: MockUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name: parsed.data.name,
      displayName: parsed.data.email.split('@')[0]!.replace(/[^a-zA-Z0-9_.-]/g, ''),
      email: parsed.data.email,
      password: parsed.data.password,
      avatarUrl: null,
      bio: '',
      website: '',
      location: '',
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    db.favorites[user.id] = []
    db.wallets[user.id] = []
    persist()

    const { token, expiresAt } = createSession(user.id)
    const context = readContext(cookies as Cookies)
    mergeGuestCart(user.id, context.guestId)

    return HttpResponse.json(
      { user: publicUser(user), expiresAt },
      { status: 201, headers: { 'Set-Cookie': sessionCookie(token, expiresAt) } },
    )
  }),

  http.delete(`${base}/session`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure

    const context = readContext(cookies as Cookies)
    destroySession(context.token ?? undefined)
    return new HttpResponse(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie() } })
  }),
]
