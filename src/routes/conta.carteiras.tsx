import { createFileRoute } from '@tanstack/react-router'
import { AccountStub } from '@/features/account/account-stub'

export const Route = createFileRoute('/conta/carteiras')({
  component: () => (
    <AccountStub title="Carteiras" description="Cadastro e edição das carteiras principal e secundária." />
  ),
})
