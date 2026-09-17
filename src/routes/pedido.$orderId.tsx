import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/app/guards'
import { OrderConfirmationPage } from '@/features/orders/order-confirmation-page'

export const Route = createFileRoute('/pedido/$orderId')({
  beforeLoad: ({ context, location }) => requireSession(context.queryClient, location.href),
  component: OrderConfirmationRoute,
})

function OrderConfirmationRoute() {
  const { orderId } = Route.useParams()
  return <OrderConfirmationPage orderId={orderId} />
}
