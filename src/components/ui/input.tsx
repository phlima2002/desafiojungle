import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // O celular usa os cantos generosos do layout mobile do Figma; a partir
        // de `md` volta o raio discreto do desktop.
        'w-full min-w-0 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-foreground transition-colors outline-none md:rounded-sm md:px-3 md:py-2.5',
        'selection:bg-primary selection:text-primary-foreground placeholder:text-clay',
        'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-bold file:text-accent',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
