import { request, requestVoid } from '../client'
import { sessionSchema, sessionStateSchema, type LoginRequest, type RegisterRequest } from '../contracts'

export const sessionApi = {
  current: (signal?: AbortSignal) => request(sessionStateSchema, { method: 'GET', url: '/session', signal }),

  login: (body: LoginRequest) => request(sessionSchema, { method: 'POST', url: '/session', data: body }),

  register: (body: RegisterRequest) =>
    request(sessionSchema, { method: 'POST', url: '/accounts', data: body }),

  logout: () => requestVoid({ method: 'DELETE', url: '/session' }),
}
