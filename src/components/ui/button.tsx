import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

/**
 * shadcn/ui Button, com as variantes do layout da Kurio.
 *
 * As cores vêm dos tokens semânticos de `styles/index.css` (`primary`,
 * `accent`, `line`, `danger`), que por sua vez saem do arquivo do Figma — então
 * ajustar o token ajusta o botão em toda a aplicação.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-bold whitespace-nowrap outline-none transition-[color,background-color,border-color,opacity] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground uppercase hover:opacity-90',
        outline: 'border border-primary text-accent hover:bg-primary hover:text-primary-foreground',
        secondary: 'border border-line bg-card-raised text-foreground hover:border-line-strong',
        ghost: 'text-foreground hover:text-accent',
        link: 'text-accent underline underline-offset-4 hover:opacity-80',
        danger: 'bg-danger text-ink-950 hover:opacity-90',
      },
      size: {
        default: 'h-11 px-6 py-3 text-base',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'size-9 rounded-sm p-0',
        pill: 'size-8 rounded-pill p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
