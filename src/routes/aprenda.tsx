import { createFileRoute } from '@tanstack/react-router'
import { OutOfScope } from '@/features/shell/out-of-scope'

export const Route = createFileRoute('/aprenda')({
  component: () => <OutOfScope title="Aprenda" />,
})
