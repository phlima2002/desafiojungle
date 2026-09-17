import { createFileRoute } from '@tanstack/react-router'
import { requireSession } from '@/app/guards'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/pagamento')({
  beforeLoad: ({ context, location }) => requireSession(context.queryClient, location.href),
  component: CheckoutPage,
})
