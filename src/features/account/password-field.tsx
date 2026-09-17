import { useState, type ComponentPropsWithoutRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Password input with the layout's reveal toggle. The button is a real control
 * with a state-dependent label, so screen readers announce what it will do.
 */
export function PasswordInput({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative block">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-sm text-sand transition-colors hover:text-accent"
      >
        {visible ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
      </button>
    </span>
  )
}
