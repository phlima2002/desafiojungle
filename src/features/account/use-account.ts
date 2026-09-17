import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import type { ChangePasswordRequest, UpdateProfileRequest, WalletInput } from '@/shared/api/contracts'
import { useSession } from '@/features/session/use-session'

export function useProfileQuery() {
  const { session, scope } = useSession()
  return useQuery({
    queryKey: queryKeys.profile(scope),
    queryFn: ({ signal }) => accountApi.profile(signal),
    enabled: Boolean(session),
    ...cachePolicy.account,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => accountApi.updateProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(scope), profile)
      // The header shows the display name, which lives on the session.
      void queryClient.invalidateQueries({ queryKey: queryKeys.session })
    },
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: (file: File) => accountApi.updateAvatar(file),
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile(scope), profile),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => accountApi.changePassword(body),
  })
}

export function useWallets() {
  const { session, scope } = useSession()
  const queryClient = useQueryClient()
  const key = queryKeys.wallets(scope)

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => accountApi.wallets(signal),
    enabled: Boolean(session),
    ...cachePolicy.account,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  return {
    query,
    create: useMutation({
      mutationFn: (body: WalletInput) => accountApi.createWallet(body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: WalletInput }) => accountApi.updateWallet(id, body),
      onSuccess: invalidate,
    }),
    connect: useMutation({ mutationFn: (id: string) => accountApi.connectWallet(id), onSuccess: invalidate }),
    disconnect: useMutation({
      mutationFn: (id: string) => accountApi.disconnectWallet(id),
      onSuccess: invalidate,
    }),
  }
}
