import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi, checkoutApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import { isApiError } from '@/shared/api/errors'
import type { CollectorDetails, CreateOrderRequest, Network, Order, Quote } from '@/shared/api/contracts'
import { useSession } from '@/features/session/use-session'

const ATTEMPT_STORAGE_KEY = 'kurio.checkout.attempt'

interface StoredAttempt {
  idempotencyKey: string
  /** The exact request body, so the retry is byte-identical to the original. */
  body: CreateOrderRequest
}

/**
 * The in-flight purchase attempt, persisted outside React. A refresh — or a
 * response that never arrives — must not turn into a second order, so the
 * idempotency key survives both.
 */
function readAttempt(): StoredAttempt | null {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAttempt) : null
  } catch {
    return null
  }
}

function writeAttempt(attempt: StoredAttempt | null): void {
  try {
    if (attempt) sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(attempt))
    else sessionStorage.removeItem(ATTEMPT_STORAGE_KEY)
  } catch {
    /* private mode — the attempt lives only in memory */
  }
}

export function useWalletsQuery() {
  const { session, scope } = useSession()
  return useQuery({
    queryKey: queryKeys.wallets(scope),
    queryFn: ({ signal }) => accountApi.wallets(signal),
    enabled: Boolean(session),
    ...cachePolicy.account,
  })
}

export function useWalletConnection() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = queryKeys.wallets(scope)

  const connect = useMutation({
    mutationFn: (walletId: string) => accountApi.connectWallet(walletId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const disconnect = useMutation({
    mutationFn: (walletId: string) => accountApi.disconnectWallet(walletId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { connect, disconnect }
}

export function useQuote(network: Network, couponCode?: string) {
  const [quote, setQuote] = useState<Quote | null>(null)

  const mutation = useMutation({
    mutationFn: () => checkoutApi.createQuote({ network, couponCode }),
    onSuccess: setQuote,
  })

  const { mutate: refresh } = mutation

  useEffect(() => {
    // Re-quote whenever an input that changes the price changes. The quote is
    // the only value the order mutation is allowed to act on.
    refresh()
  }, [network, couponCode, refresh])

  return { quote, refresh, isPending: mutation.isPending, error: mutation.error }
}

export type CheckoutPhase =
  | { kind: 'idle' }
  /** Replaying an attempt that was interrupted before its answer arrived. */
  | { kind: 'recovering' }
  | { kind: 'submitting' }
  | { kind: 'needs-review'; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'placed'; order: Order }

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const stored = useRef<StoredAttempt | null>(readAttempt())
  const [phase, setPhase] = useState<CheckoutPhase>(() =>
    readAttempt() ? { kind: 'recovering' } : { kind: 'idle' },
  )

  const settle = useCallback(
    (order: Order) => {
      stored.current = null
      writeAttempt(null)
      queryClient.setQueryData(queryKeys.order(scope, order.id), order)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      setPhase({ kind: 'placed', order })
    },
    [queryClient, scope],
  )

  const submit = useCallback(
    async (attempt: StoredAttempt) => {
      try {
        const order = await checkoutApi.createOrder(attempt.body, attempt.idempotencyKey)
        settle(order)
        return
      } catch (error) {
        if (!isApiError(error)) {
          setPhase({ kind: 'failed', message: 'Não foi possível concluir a compra.' })
          return
        }

        if (error.isTransient) {
          // The order may already exist even though the answer never arrived.
          // The attempt stays on disk so the next mount can replay the key.
          setPhase({
            kind: 'failed',
            message:
              'A resposta do servidor não chegou. Tente de novo — a mesma chave é reenviada, então nenhum segundo pedido é criado.',
          })
          return
        }

        stored.current = null
        writeAttempt(null)

        if (
          ['QUOTE_STALE', 'PRICE_CHANGED', 'EDITION_SOLD_OUT', 'INSUFFICIENT_AVAILABILITY'].includes(
            error.code,
          )
        ) {
          setPhase({ kind: 'needs-review', message: error.message })
          return
        }

        setPhase({ kind: 'failed', message: error.message })
      }
    },
    [settle],
  )

  /**
   * An attempt found on disk means a purchase was started and its answer was
   * lost. Replaying the same idempotency key asks the server which of the two
   * happened — and it answers with the order that already exists, never a new
   * one.
   */
  useEffect(() => {
    const attempt = stored.current
    if (!attempt) return
    void submit(attempt)
  }, [submit])

  const place = useCallback(
    async (body: CreateOrderRequest) => {
      // Repeated clicks and re-submits never start a second attempt.
      if (phase.kind === 'submitting' || phase.kind === 'recovering') return

      const previous = stored.current
      const sameOrder =
        previous?.body.quoteId === body.quoteId && previous?.body.quoteFingerprint === body.quoteFingerprint
      const attempt: StoredAttempt = {
        idempotencyKey: sameOrder ? previous!.idempotencyKey : `idem_${crypto.randomUUID()}`,
        body,
      }

      stored.current = attempt
      writeAttempt(attempt)
      setPhase({ kind: 'submitting' })
      await submit(attempt)
    },
    [phase.kind, submit],
  )

  const retry = useCallback(async () => {
    const attempt = stored.current
    if (!attempt) return
    setPhase({ kind: 'submitting' })
    await submit(attempt)
  }, [submit])

  const reset = useCallback(() => {
    stored.current = null
    writeAttempt(null)
    setPhase({ kind: 'idle' })
  }, [])

  return { phase, place, retry, reset, hasPendingAttempt: phase.kind === 'recovering' }
}

export type { CollectorDetails }
