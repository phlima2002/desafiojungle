import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartApi } from '@/shared/api/endpoints'
import { cachePolicy, queryKeys } from '@/shared/api/query-keys'
import type { AddCartItemRequest, Cart } from '@/shared/api/contracts'
import { useSession } from '@/features/session/use-session'
import { mulEth } from '@/shared/lib/money'

export function useCartQuery() {
  const { scope } = useSession()
  return useQuery({
    queryKey: queryKeys.cart(scope),
    queryFn: ({ signal }) => cartApi.get(signal),
    ...cachePolicy.cart,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: (body: AddCartItemRequest) => cartApi.addItem(body),
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(scope), cart),
  })
}

/**
 * Quantity changes are applied optimistically — the stepper must feel
 * instantaneous — and rolled back to the server's cart on failure.
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = queryKeys.cart(scope)

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateItem(itemId, { quantity }),

    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) {
        queryClient.setQueryData<Cart>(key, {
          ...previous,
          items: previous.items
            .map((item) =>
              item.id === itemId ? { ...item, quantity, lineTotal: mulEth(item.unitPrice, quantity) } : item,
            )
            .filter((item) => item.quantity > 0),
        })
      }
      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },

    onSuccess: (cart) => queryClient.setQueryData(key, cart),
    // The server owns discount and fee maths; always settle on its answer.
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(scope), cart),
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon({ code }),
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(scope), cart),
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(scope), cart),
  })
}
