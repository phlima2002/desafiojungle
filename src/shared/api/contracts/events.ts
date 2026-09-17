import { z } from 'zod'
import { idSchema, isoDateTimeSchema, versionSchema } from './common'
import { ethAmountSchema } from './common'
import { orderStatusSchema } from './orders'

/**
 * Realtime envelope. Every event carries a stable identity (`resourceId`), the
 * resource kind and a monotonic `version`, so the client can drop duplicates
 * and out-of-order deliveries without ever regressing to older state.
 */
const envelope = {
  eventId: idSchema,
  resourceId: idSchema,
  version: versionSchema,
  emittedAt: isoDateTimeSchema,
  /** Scopes the event to a session; events from another user are discarded. */
  audienceUserId: idSchema.nullable(),
}

export const nftUpdatedEventSchema = z.object({
  ...envelope,
  resource: z.literal('nft'),
  price: ethAmountSchema,
  compareAtPrice: ethAmountSchema.nullable(),
  available: z.number().int().nonnegative(),
  editions: z.array(
    z.object({ id: idSchema, available: z.number().int().nonnegative(), price: ethAmountSchema }),
  ),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...envelope,
  resource: z.literal('order'),
  status: orderStatusSchema,
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  declineReason: z.string().nullable(),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  subscribe: 'client.subscribe',
  unsubscribe: 'client.unsubscribe',
  identify: 'client.identify',
} as const

export type ServerEvents = {
  'nft.updated': NftUpdatedEvent
  'order.updated': OrderUpdatedEvent
}
