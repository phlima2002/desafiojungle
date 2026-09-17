import { HttpResponse, http } from 'msw'
import { env } from '@/shared/config/env'
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  changePasswordRequestSchema,
  updateProfileRequestSchema,
  walletInputSchema,
  type FieldError,
  type Wallet,
} from '@/shared/api/contracts'
import { db, findUserByEmail, persist } from '../db'
import type { MockUser } from '../db/types'
import { applyNetworkConditions, errorResponse } from '../network'
import { isResponse, readContext, requireUser, type Cookies } from './context'

const base = env.apiBaseUrl

function profileOf(user: MockUser) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    ensTld: user.ensTld,
    ensName: user.ensName,
    walletLabel: user.walletLabel,
    createdAt: user.createdAt,
  }
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string; code: string }>): FieldError[] {
  return issues.map((issue) => ({
    field: issue.path.map(String).join('.') || 'form',
    code: issue.code,
    message: issue.message,
  }))
}

export const accountHandlers = [
  http.get(`${base}/profile`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user
    return HttpResponse.json(profileOf(user))
  }),

  http.patch(`${base}/profile`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const parsed = updateProfileRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Confira os campos destacados.', {
        details: fieldErrors(parsed.error.issues),
      })
    }

    const emailOwner = findUserByEmail(parsed.data.email)
    if (emailOwner && emailOwner.id !== user.id) {
      return errorResponse('EMAIL_ALREADY_REGISTERED', 'Este e-mail já pertence a outra conta.', {
        details: [{ field: 'email', code: 'conflict', message: 'E-mail já cadastrado' }],
      })
    }
    const usernameOwner = db.users.find(
      (candidate) => candidate.username === parsed.data.username && candidate.id !== user.id,
    )
    if (usernameOwner) {
      return errorResponse('CONFLICT', 'Este nome de usuário já está em uso.', {
        details: [{ field: 'username', code: 'conflict', message: 'Nome de usuário indisponível' }],
      })
    }

    Object.assign(user, parsed.data)
    persist()
    return HttpResponse.json(profileOf(user))
  }),

  http.post(`${base}/profile/avatar`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const form = await request.formData()
    const file = form.get('avatar')
    if (!(file instanceof File)) {
      return errorResponse('VALIDATION_ERROR', 'Selecione uma imagem.', {
        details: [{ field: 'avatar', code: 'required', message: 'Selecione uma imagem' }],
      })
    }
    if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
      return errorResponse('VALIDATION_ERROR', 'Formato não suportado. Use PNG, JPEG ou WebP.', {
        details: [{ field: 'avatar', code: 'mime', message: 'Use PNG, JPEG ou WebP' }],
      })
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return errorResponse('VALIDATION_ERROR', 'A imagem deve ter no máximo 2 MB.', {
        details: [{ field: 'avatar', code: 'size', message: 'Máximo de 2 MB' }],
      })
    }

    const buffer = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    user.avatarUrl = `data:${file.type};base64,${btoa(binary)}`
    persist()
    return HttpResponse.json(profileOf(user))
  }),

  http.post(`${base}/profile/password`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const parsed = changePasswordRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Confira os campos destacados.', {
        details: fieldErrors(parsed.error.issues),
      })
    }
    if (parsed.data.currentPassword !== user.password) {
      return errorResponse('VALIDATION_ERROR', 'A senha atual está incorreta.', {
        details: [{ field: 'currentPassword', code: 'invalid', message: 'Senha atual incorreta' }],
      })
    }

    user.password = parsed.data.newPassword
    persist()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${base}/wallets`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user
    return HttpResponse.json({ items: db.wallets[user.id] ?? [] })
  }),

  http.post(`${base}/wallets`, async ({ request, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const parsed = walletInputSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Confira os campos destacados.', {
        details: fieldErrors(parsed.error.issues),
      })
    }

    const wallets = db.wallets[user.id] ?? []
    if (wallets.some((wallet) => wallet.address.toLowerCase() === parsed.data.address.toLowerCase())) {
      return errorResponse('CONFLICT', 'Esta carteira já está cadastrada.', {
        details: [{ field: 'address', code: 'conflict', message: 'Carteira já cadastrada' }],
      })
    }

    const wallet: Wallet = {
      id: `wal-${crypto.randomUUID().slice(0, 8)}`,
      ...parsed.data,
      connected: false,
      createdAt: new Date().toISOString(),
    }
    // Only one primary wallet at a time.
    if (wallet.role === 'primary') {
      for (const candidate of wallets) candidate.role = 'secondary'
    }
    db.wallets[user.id] = [...wallets, wallet]
    persist()
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.put(`${base}/wallets/:walletId`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const parsed = walletInputSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Confira os campos destacados.', {
        details: fieldErrors(parsed.error.issues),
      })
    }

    const wallets = db.wallets[user.id] ?? []
    const wallet = wallets.find((candidate) => candidate.id === String(params.walletId))
    if (!wallet) return errorResponse('NOT_FOUND', 'Carteira não encontrada.')

    Object.assign(wallet, parsed.data)
    if (parsed.data.role === 'primary') {
      for (const other of wallets) if (other.id !== wallet.id) other.role = 'secondary'
    }
    persist()
    return HttpResponse.json(wallet)
  }),

  http.post(`${base}/wallets/:walletId/connection`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const wallet = (db.wallets[user.id] ?? []).find((candidate) => candidate.id === String(params.walletId))
    if (!wallet) return errorResponse('NOT_FOUND', 'Carteira não encontrada.')

    // A "Ledger" wallet always refuses in the simulation, which gives the UI a
    // deterministic way to exercise the refused-connection branch.
    if (wallet.provider === 'ledger') {
      return errorResponse('WALLET_CONNECTION_REFUSED', 'A carteira recusou a conexão.')
    }

    wallet.connected = true
    persist()
    return HttpResponse.json(wallet)
  }),

  http.delete(`${base}/wallets/:walletId/connection`, async ({ request, params, cookies }) => {
    const failure = await applyNetworkConditions(request)
    if (failure) return failure
    const user = requireUser(readContext(cookies as Cookies))
    if (isResponse(user)) return user

    const wallet = (db.wallets[user.id] ?? []).find((candidate) => candidate.id === String(params.walletId))
    if (!wallet) return errorResponse('NOT_FOUND', 'Carteira não encontrada.')

    wallet.connected = false
    persist()
    return HttpResponse.json(wallet)
  }),
]
