import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { env } from '@/shared/config/env'
import { SOCKET_EVENTS, type NftUpdatedEvent, type OrderUpdatedEvent } from '@/shared/api/contracts'
import { db, findNft, findOrder, onDbEvent } from '../db'
import { getScenario } from '../scenarios'

/**
 * Socket.IO is mocked at the transport level: `socket.io-client` really opens a
 * WebSocket, really performs the Engine.IO handshake and really decodes
 * Socket.IO frames. `@mswjs/socket.io-binding` sits on the MSW WebSocket
 * interceptor and speaks the same wire protocol, so nothing in the app is
 * bypassed or stubbed.
 *
 * Known limitations of this transport in the mock environment are documented in
 * ARCHITECTURE.md: only the default namespace `/` is served, `transports` must
 * be `['websocket']` (there is no HTTP long-polling fallback), and rooms and
 * acknowledgements are not implemented.
 */
const socketUrl = new URL(env.socketUrl)
/**
 * MSW strips the `/socket.io/` prefix from the client URL before matching a
 * WebSocket handler, so the link is registered against the bare origin.
 */
export const realtimeLink = ws.link(`wss://${socketUrl.host}`)

interface ConnectionState {
  userId: string | null
  nftIds: Set<string>
  orderIds: Set<string>
  emit: (event: string, payload: unknown) => void
}

const connections = new Set<ConnectionState>()

function nftEventFor(nftId: string, versionOffset = 0): NftUpdatedEvent | null {
  const nft = findNft(nftId)
  if (!nft) return null
  return {
    eventId: `evt_${crypto.randomUUID()}`,
    resource: 'nft',
    resourceId: nft.id,
    version: nft.version - versionOffset,
    emittedAt: new Date().toISOString(),
    audienceUserId: null,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    available: nft.available,
    editions: nft.editions.map((edition) => ({
      id: edition.id,
      available: edition.available,
      price: edition.price,
    })),
  }
}

function orderEventFor(orderId: string): OrderUpdatedEvent | null {
  const order = findOrder(orderId)
  if (!order) return null
  return {
    eventId: `evt_${crypto.randomUUID()}`,
    resource: 'order',
    resourceId: order.id,
    version: order.version,
    emittedAt: new Date().toISOString(),
    audienceUserId: order.userId,
    status: order.status,
    transactionHash: order.transactionHash,
    explorerUrl: order.explorerUrl,
    declineReason: order.declineReason,
  }
}

function broadcastNft(nftId: string): void {
  const event = nftEventFor(nftId)
  if (!event) return
  const scenario = getScenario()

  for (const connection of connections) {
    if (!connection.nftIds.has(nftId)) continue
    connection.emit(SOCKET_EVENTS.nftUpdated, event)

    if (scenario.emitDuplicateEvents) {
      // A byte-identical duplicate plus a stale (older version) event: the
      // client must ignore both without regressing or double-applying.
      connection.emit(SOCKET_EVENTS.nftUpdated, event)
      const stale = nftEventFor(nftId, 2)
      if (stale)
        connection.emit(SOCKET_EVENTS.nftUpdated, { ...stale, eventId: `evt_${crypto.randomUUID()}` })
    }
  }
}

function broadcastOrder(orderId: string, userId: string): void {
  const event = orderEventFor(orderId)
  if (!event) return
  for (const connection of connections) {
    // Events never cross accounts, even if a stale connection is still open.
    if (connection.userId !== userId) continue
    if (connection.orderIds.size > 0 && !connection.orderIds.has(orderId)) continue
    connection.emit(SOCKET_EVENTS.orderUpdated, event)
  }
}

onDbEvent((event) => {
  if (event.type === 'nft.changed') broadcastNft(event.nftId)
  if (event.type === 'order.changed') broadcastOrder(event.orderId, event.userId)
})

export const socketHandlers = [
  realtimeLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)

    const state: ConnectionState = {
      userId: null,
      nftIds: new Set(),
      orderIds: new Set(),
      emit: (event, payload) => io.client.emit(event, payload),
    }
    connections.add(state)

    // Engine.IO keep-alive. Without server pings socket.io-client tears the
    // connection down after pingInterval + pingTimeout.
    const heartbeat = window.setInterval(() => {
      try {
        connection.client.send('2')
      } catch {
        window.clearInterval(heartbeat)
      }
    }, 20_000)

    io.client.on(SOCKET_EVENTS.identify, (_event, payload) => {
      state.userId = (payload as { userId: string | null } | undefined)?.userId ?? null
    })

    io.client.on(SOCKET_EVENTS.subscribe, (_event, payload) => {
      const data = payload as { nftIds?: string[]; orderIds?: string[] } | undefined
      for (const id of data?.nftIds ?? []) state.nftIds.add(id)
      for (const id of data?.orderIds ?? []) state.orderIds.add(id)

      // Reconciliation shortcut: the server immediately replays the current
      // state of everything just subscribed, so a client that reconnects is
      // never left with a stale view while waiting for the next change.
      for (const id of data?.nftIds ?? []) {
        const event = nftEventFor(id)
        if (event) state.emit(SOCKET_EVENTS.nftUpdated, event)
      }
      for (const id of data?.orderIds ?? []) {
        const event = orderEventFor(id)
        if (event && event.audienceUserId === state.userId) state.emit(SOCKET_EVENTS.orderUpdated, event)
      }
    })

    io.client.on(SOCKET_EVENTS.unsubscribe, (_event, payload) => {
      const data = payload as { nftIds?: string[]; orderIds?: string[] } | undefined
      for (const id of data?.nftIds ?? []) state.nftIds.delete(id)
      for (const id of data?.orderIds ?? []) state.orderIds.delete(id)
    })

    connection.client.addEventListener('close', () => {
      window.clearInterval(heartbeat)
      connections.delete(state)
    })
  }),
]

/** Test hooks: drive the realtime channel deterministically from Playwright. */
export const realtimeControls = {
  /** Number of open mock connections — used to assert cleanup on logout. */
  connectionCount: () => connections.size,

  /** Drops every open socket, simulating a network interruption. */
  disconnectAll: () => {
    for (const connection of connections) connection.emit('server.shutdown', {})
    realtimeLink.broadcast('')
    connections.clear()
  },

  emitNftUpdate: (nftId: string) => broadcastNft(nftId),

  emitOrderUpdate: (orderId: string) => {
    const order = findOrder(orderId)
    if (order) broadcastOrder(order.id, order.userId)
  },

  /** Replays the newest order event for every open connection. */
  replayLatestOrder: () => {
    const order = db.orders.at(-1)
    if (order) broadcastOrder(order.id, order.userId)
  },
}
