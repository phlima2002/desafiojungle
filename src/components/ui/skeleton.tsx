import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

/**
 * O brilho e o respeito a `prefers-reduced-motion` ficam na classe `.skeleton`
 * de `styles/index.css`, para que o mesmo tratamento valha também nos poucos
 * lugares que precisam de um esqueleto sem componente.
 */
function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden className={cn('skeleton', className)} {...props} />
}

export { Skeleton }
