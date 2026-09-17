import { request, requestVoid } from '../client'
import {
  profileSchema,
  walletSchema,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
  type WalletInput,
} from '../contracts'
import { z } from 'zod'

const walletsResponseSchema = z.object({ items: z.array(walletSchema) })

export const accountApi = {
  profile: (signal?: AbortSignal) => request(profileSchema, { method: 'GET', url: '/profile', signal }),

  updateProfile: (body: UpdateProfileRequest) =>
    request(profileSchema, { method: 'PATCH', url: '/profile', data: body }),

  updateAvatar: (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return request(profileSchema, {
      method: 'POST',
      url: '/profile/avatar',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  changePassword: (body: ChangePasswordRequest) =>
    requestVoid({ method: 'POST', url: '/profile/password', data: body }),

  wallets: (signal?: AbortSignal) =>
    request(walletsResponseSchema, { method: 'GET', url: '/wallets', signal }),

  createWallet: (body: WalletInput) => request(walletSchema, { method: 'POST', url: '/wallets', data: body }),

  updateWallet: (walletId: string, body: WalletInput) =>
    request(walletSchema, {
      method: 'PUT',
      url: `/wallets/${encodeURIComponent(walletId)}`,
      data: body,
    }),

  connectWallet: (walletId: string) =>
    request(walletSchema, {
      method: 'POST',
      url: `/wallets/${encodeURIComponent(walletId)}/connection`,
    }),

  disconnectWallet: (walletId: string) =>
    request(walletSchema, {
      method: 'DELETE',
      url: `/wallets/${encodeURIComponent(walletId)}/connection`,
    }),
}
