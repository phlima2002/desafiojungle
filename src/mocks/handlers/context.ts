import { errorResponse } from '../network'
import { db, findSession, findUserById, persist } from '../db'
import type { MockUser } from '../db/types'

export const SESSION_COOKIE = 'kurio_session'
export const GUEST_COOKIE = 'kurio_guest'

export type Cookies = Record<string, string>

export interface RequestContext {
  user: MockUser | null
  guestId: string | null
  token: string | null
  /** Set when a valid token exists but its expiry has passed. */
  expired: boolean
}

export function readContext(cookies: Cookies): RequestContext {
  const token = cookies[SESSION_COOKIE] ?? null
  const guestId = cookies[GUEST_COOKIE] ?? null
  const session = findSession(token ?? undefined)

  if (!session) return { user: null, guestId, token, expired: false }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.sessions = db.sessions.filter((candidate) => candidate.token !== session.token)
    persist()
    return { user: null, guestId, token, expired: true }
  }

  return { user: findUserById(session.userId) ?? null, guestId, token, expired: false }
}

/**
 * Guard for every private endpoint. An expired session is reported distinctly
 * from "never authenticated" so the UI can offer to resume where it left off.
 */
export function requireUser(context: RequestContext): MockUser | Response {
  if (context.user) return context.user
  if (context.expired) {
    return errorResponse('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  return errorResponse('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response
}

export function sessionCookie(token: string, expiresAt: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`
}

export function guestCookie(guestId: string): string {
  return `${GUEST_COOKIE}=${guestId}; Path=/; SameSite=Lax; Max-Age=2592000`
}
