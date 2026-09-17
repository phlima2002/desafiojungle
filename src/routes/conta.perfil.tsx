import { createFileRoute } from '@tanstack/react-router'
import { AccountStub } from '@/features/account/account-stub'

export const Route = createFileRoute('/conta/perfil')({
  component: () => (
    <AccountStub title="Perfil do colecionador" description="Edição de dados, avatar e alteração de senha." />
  ),
})
