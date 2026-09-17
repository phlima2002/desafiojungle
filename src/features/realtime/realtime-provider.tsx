import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { whenNetworkReady } from '@/shared/api/client'
import type { NftDetail, NftListResponse, NftUpdatedEvent, Order } from '@/shared/api/contracts'
import { useSession } from '@/features/session/use-session'
import { RealtimeClient, type RealtimeStatus } from './socket-client'

interface RealtimeContextValue {
  status: RealtimeStatus
  subscribeNfts: (ids: readonly string[]) => void
  unsubscribeNfts: (ids: readonly string[]) => void
  subscribeOrders: (ids: readonly string[]) => void
  unsubscribeOrders: (ids: readonly string[]) => void
  /** Last catalogue change seen, so pages can surface an inline notice. */
  lastNftChange: NftUpdatedEvent | null
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { session } = useSession()
  const userId = session?.user.id ?? null

  const [status, setStatus] = useState<RealtimeStatus>('idle')
  const [lastNftChange, setLastNftChange] = useState<NftUpdatedEvent | null>(null)
  const clientRef = useRef<RealtimeClient | null>(null)

  useEffect(() => {
    const client = new RealtimeClient({
      onStatus: setStatus,

      onNft: (event) => {
        setLastNftChange(event)

        // Patch the detail cache in place — no refetch needed, the event
        // carries everything that changed.
        queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(event.resourceId), (current) =>
          current && current.version < event.version
            ? {
                ...current,
                price: event.price,
                compareAtPrice: event.compareAtPrice,
                available: event.available,
                version: event.version,
                editions: current.editions.map((edition) => {
                  const update = event.editions.find((candidate) => candidate.id === edition.id)
                  return update ? { ...edition, available: update.available, price: update.price } : edition
                }),
              }
            : current,
        )

        queryClient.setQueriesData<NftListResponse>(
          { queryKey: [...queryKeys.nfts.all, 'list'] },
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.map((item) =>
                    item.id === event.resourceId && item.version < event.version
                      ? {
                          ...item,
                          price: event.price,
                          compareAtPrice: event.compareAtPrice,
                          available: event.available,
                          version: event.version,
                        }
                      : item,
                  ),
                }
              : current,
        )

        // The cart's totals are computed by the server; re-read rather than
        // guessing them on the client.
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
      },

      onOrder: (event) => {
        queryClient.setQueriesData<Order>({ queryKey: ['order'] }, (current) =>
          current && current.id === event.resourceId && current.version < event.version
            ? {
                ...current,
                status: event.status,
                transactionHash: event.transactionHash,
                explorerUrl: event.explorerUrl,
                declineReason: event.declineReason,
                version: event.version,
              }
            : current,
        )
        void queryClient.invalidateQueries({ queryKey: ['order'] })
      },

      onReconnect: () => {
        // Reconciliation after a gap: everything the user is looking at is
        // re-read from REST, because events emitted while offline are lost.
        void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: ['order'] })
      },
    })

    clientRef.current = client

    // The realtime channel is not needed for the first paint: connecting on an
    // idle callback keeps the socket transport off the critical path.
    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback
        : (callback: () => void) => window.setTimeout(callback, 1)
    const handle = schedule(() => {
      // Waits for the mock transport to be installed before opening the socket.
      void whenNetworkReady()
        .then(() => client.connect())
        .then(() => client.identify(userId))
    })

    return () => {
      if (typeof window.cancelIdleCallback === 'function' && typeof handle === 'number') {
        window.cancelIdleCallback(handle)
      }
      client.destroy()
      clientRef.current = null
    }
    // Re-created on user switch: the previous session's subscriptions and
    // de-duplication state must not survive.
  }, [queryClient, userId])

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      lastNftChange,
      subscribeNfts: (ids) => clientRef.current?.subscribeNfts(ids),
      unsubscribeNfts: (ids) => clientRef.current?.unsubscribeNfts(ids),
      subscribeOrders: (ids) => clientRef.current?.subscribeOrders(ids),
      unsubscribeOrders: (ids) => clientRef.current?.unsubscribeOrders(ids),
    }),
    [status, lastNftChange],
  )

  return <RealtimeContext value={value}>{children}</RealtimeContext>
}

export function useRealtime(): RealtimeContextValue {
  const context = use(RealtimeContext)
  if (!context) throw new Error('useRealtime precisa estar dentro de <RealtimeProvider>')
  return context
}

/** Subscribes to a set of NFTs for the lifetime of the calling component. */
export function useNftSubscription(ids: readonly string[]): void {
  const { subscribeNfts, unsubscribeNfts } = useRealtime()
  const key = ids.join(',')
  useEffect(() => {
    const list = key ? key.split(',') : []
    if (!list.length) return
    subscribeNfts(list)
    return () => unsubscribeNfts(list)
  }, [key, subscribeNfts, unsubscribeNfts])
}
