import axios from 'axios'
import { apiErrorSchema, type ApiErrorCode, type FieldError } from './contracts/common'

/**
 * Single error type the whole app branches on. Anything thrown by the transport
 * — HTTP status, network failure, timeout, contract violation — is normalised
 * into this shape by the Axios response interceptor.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details: FieldError[]
  readonly meta: Record<string, unknown>
  readonly requestId?: string

  constructor(init: {
    code: ApiErrorCode
    message: string
    status: number
    details?: FieldError[]
    meta?: Record<string, unknown>
    requestId?: string
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.details = init.details ?? []
    this.meta = init.meta ?? {}
    this.requestId = init.requestId
  }

  /** Transport-level problems worth retrying automatically. */
  get isTransient(): boolean {
    return this.code === 'TRANSIENT_FAILURE' || this.status === 0 || this.status >= 500
  }

  get isAuthProblem(): boolean {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED'
  }

  /** Field errors keyed by form field, ready for react-hook-form setError. */
  fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]))
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const NETWORK_MESSAGE = 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'
const TIMEOUT_MESSAGE = 'A requisição demorou demais para responder.'

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isCancel(error)) {
    return new ApiError({ code: 'TRANSIENT_FAILURE', message: 'Requisição cancelada.', status: 0 })
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const parsed = apiErrorSchema.safeParse(error.response?.data)

    if (parsed.success) {
      return new ApiError({
        code: parsed.data.error.code,
        message: parsed.data.error.message,
        status,
        details: parsed.data.error.details ?? [],
        meta: (parsed.data.error.meta ?? {}) as Record<string, unknown>,
        requestId: parsed.data.error.requestId,
      })
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ code: 'TRANSIENT_FAILURE', message: TIMEOUT_MESSAGE, status: 408 })
    }

    if (status === 0) {
      return new ApiError({ code: 'TRANSIENT_FAILURE', message: NETWORK_MESSAGE, status: 0 })
    }

    return new ApiError({
      code: status === 404 ? 'NOT_FOUND' : status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
      message: error.message || 'Erro inesperado na requisição.',
      status,
    })
  }

  return new ApiError({
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Erro inesperado.',
    status: 0,
  })
}
