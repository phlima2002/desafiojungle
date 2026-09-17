import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RegisterPage } from '@/features/auth/register-page'

export const Route = createFileRoute('/criar-conta')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: RegisterPage,
})
