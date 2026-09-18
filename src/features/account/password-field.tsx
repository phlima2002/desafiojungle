import { useState, type ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/utils'

/**
 * Password input with the layout's reveal toggle. The button is a real control
 * with a state-dependent label, so screen readers announce what it will do.
 */
export function PasswordInput({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative block">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 h-auto w-10 text-sand"
      >
        {visible ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
      </Button>
    </span>
  )
}
