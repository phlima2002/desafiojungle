import type { Socket } from 'socket.io-client'
import { env } from '@/shared/config/env'
import {
  SOCKET_EVENTS,
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
} from '@/shared/api/contracts'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

type Handlers = {
  onNft: (event: NftUpdatedEvent) => void
  onOrder: (event: OrderUpdatedEvent) => void
  onStatus: (status: RealtimeStatus) => void
  /** Fired after a reconnect so the caller can reconcile against REST. */
  onReconnect: () => void
}

/**
 * Thin wrapper over socket.io-client. It owns three responsibilities the rest
 * of the app should not care about: connection lifecycle, per-resource
 * subscriptions, and dropping events that are duplicated, stale or addressed to
 * a different account.
 */
export class RealtimeClient {
  private socket: Socket | null = null
  private readonly seenEventIds = new Set<string>()
  private readonly versions = new Map<string, number>()
  private readonly nftIds = new Set<string>()
  private readonly orderIds = new Set<string>()
  private userId: string | null = null
  private hasConnectedOnce = false
  private connecting = false
  private destroyed = false

  private readonly handlers: Handlers

  constructor(handlers: Handlers) {
    this.handlers = handlers
  }

  /**
   * `socket.io-client` is imported lazily for two reasons: it keeps ~40 kB of
   * transport code out of the critical path, and `engine.io-client` captures
   * `globalThis.WebSocket` when its module is evaluated — deferring that to
   * after the mock server has started is what lets the mock transport work.
   */
  async connect(): Promise<void> {
    if (this.socket || this.connecting) return
    this.connecting = true

    this.handlers.onStatus('connecting')
    const { io } = await import('socket.io-client')
    if (this.destroyed) return

    this.socket = io(env.socketUrl, {
      // The mock transport speaks WebSocket only — there is no HTTP polling
      // fallback in the MSW environment.
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 400,
      reconnectionDelayMax: 4_000,
      timeout: 8_000,
    })

    this.socket.on('connect', () => {
      this.handlers.onStatus('connected')
      this.identify(this.userId)
      this.pushSubscriptions()
      if (this.hasConnectedOnce) this.handlers.onReconnect()
      this.hasConnectedOnce = true
    })

    this.socket.on('disconnect', () => this.handlers.onStatus('reconnecting'))
    this.socket.on('connect_error', () => this.handlers.onStatus('offline'))

    this.socket.on(SOCKET_EVENTS.nftUpdated, (payload: unknown) => {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return
      if (!this.accept(parsed.data.eventId, `nft:${parsed.data.resourceId}`, parsed.data.version)) return
      this.handlers.onNft(parsed.data)
    })

    this.socket.on(SOCKET_EVENTS.orderUpdated, (payload: unknown) => {
      const parsed = orderUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return
      // An event addressed to another account never touches this session.
      if (parsed.data.audienceUserId && parsed.data.audienceUserId !== this.userId) return
      if (!this.accept(parsed.data.eventId, `order:${parsed.data.resourceId}`, parsed.data.version)) return
      this.handlers.onOrder(parsed.data)
    })

    this.connecting = false
  }

  /** Duplicate id, or a version at or below what we already applied → drop. */
  private accept(eventId: string, resourceKey: string, version: number): boolean {
    if (this.seenEventIds.has(eventId)) return false
    const applied = this.versions.get(resourceKey)
    if (applied !== undefined && version <= applied) return false

    this.seenEventIds.add(eventId)
    if (this.seenEventIds.size > 500) {
      // Bounded memory: drop the oldest half once the set grows large.
      const iterator = this.seenEventIds.values()
      for (let i = 0; i < 250; i += 1) this.seenEventIds.delete(iterator.next().value as string)
    }
    this.versions.set(resourceKey, version)
    return true
  }

  identify(userId: string | null): void {
    this.userId = userId
    this.socket?.emit(SOCKET_EVENTS.identify, { userId })
  }

  subscribeNfts(ids: readonly string[]): void {
    const added = ids.filter((id) => !this.nftIds.has(id))
    for (const id of added) this.nftIds.add(id)
    if (added.length) this.socket?.emit(SOCKET_EVENTS.subscribe, { nftIds: added })
  }

  unsubscribeNfts(ids: readonly string[]): void {
    const removed = ids.filter((id) => this.nftIds.delete(id))
    if (removed.length) this.socket?.emit(SOCKET_EVENTS.unsubscribe, { nftIds: removed })
  }

  subscribeOrders(ids: readonly string[]): void {
    const added = ids.filter((id) => !this.orderIds.has(id))
    for (const id of added) this.orderIds.add(id)
    if (added.length) this.socket?.emit(SOCKET_EVENTS.subscribe, { orderIds: added })
  }

  unsubscribeOrders(ids: readonly string[]): void {
    const removed = ids.filter((id) => this.orderIds.delete(id))
    if (removed.length) this.socket?.emit(SOCKET_EVENTS.unsubscribe, { orderIds: removed })
  }

  private pushSubscriptions(): void {
    if (this.nftIds.size) this.socket?.emit(SOCKET_EVENTS.subscribe, { nftIds: [...this.nftIds] })
    if (this.orderIds.size) this.socket?.emit(SOCKET_EVENTS.subscribe, { orderIds: [...this.orderIds] })
  }

  /**
   * Full teardown. Called on logout and on user switch so that no listener,
   * subscription or seen-version from the previous session survives.
   */
  destroy(): void {
    this.destroyed = true
    this.connecting = false
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = null
    this.seenEventIds.clear()
    this.versions.clear()
    this.nftIds.clear()
    this.orderIds.clear()
    this.userId = null
    this.hasConnectedOnce = false
    this.handlers.onStatus('idle')
  }
}
