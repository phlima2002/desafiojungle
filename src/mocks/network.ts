import { HttpResponse, delay } from 'msw'
import type { ApiErrorCode, FieldError } from '@/shared/api/contracts'
import { SCENARIO_HEADER } from '@/shared/api/client'
import { getScenario, type ScenarioConfig } from './scenarios'

export function scenarioFor(request: Request): ScenarioConfig {
  return getScenario(request.headers.get(SCENARIO_HEADER))
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EMAIL_ALREADY_REGISTERED: 409,
  INVALID_CREDENTIALS: 401,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  QUOTE_STALE: 409,
  PRICE_CHANGED: 409,
  EDITION_SOLD_OUT: 409,
  INSUFFICIENT_AVAILABILITY: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  ORDER_ALREADY_FINALIZED: 409,
  PAYMENT_DECLINED: 402,
  WALLET_CONNECTION_REFUSED: 409,
  RATE_LIMITED: 429,
  TRANSIENT_FAILURE: 503,
  INTERNAL_ERROR: 500,
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  options: { details?: FieldError[]; meta?: Record<string, unknown>; status?: number } = {},
) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        details: options.details,
        meta: options.meta,
        requestId: crypto.randomUUID(),
      },
    },
    { status: options.status ?? STATUS_BY_CODE[code] },
  )
}

/**
 * Applies the scenario's network conditions before a handler runs. Returning a
 * Response short-circuits the handler with a simulated failure; returning
 * `null` means the request may proceed.
 */
export async function applyNetworkConditions(request: Request): Promise<Response | null> {
  const scenario = scenarioFor(request)
  const [min, max] = scenario.latency
  const jitter = min === max ? min : min + Math.random() * (max - min)

  // Out-of-order responses: a fraction of reads is deliberately delayed past
  // the requests issued after them, which is what the client's cancellation and
  // stale-response handling has to survive.
  const extra = request.method === 'GET' && Math.random() < scenario.outOfOrder ? 900 : 0
  await delay(jitter + extra)

  if (Math.random() < scenario.connectionFailureRate) {
    return HttpResponse.error()
  }

  if (Math.random() < scenario.serverErrorRate) {
    return errorResponse('TRANSIENT_FAILURE', 'O serviço está temporariamente indisponível.')
  }

  return null
}

/** Never resolves — reproduces a request that dies after the server acted. */
export function hangForever(): Promise<Response> {
  return new Promise<Response>(() => {})
}
