import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  label: string
  disabled?: boolean
  onChange: (next: number) => void
}

/**
 * The stepper the layout shows: two round controls with the quantity between
 * them. The number itself stays a real `<input type="number">` so it can be
 * typed into, read by assistive tech and driven from the keyboard.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  label,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next))
  const buttonClass =
    'grid size-7 shrink-0 place-items-center rounded-pill bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus aria-hidden size={14} />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={`Quantidade de ${label}`}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
        className={cn(
          'w-10 border-0 bg-transparent p-0 text-center text-xs font-bold text-foreground',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />

      <button
        type="button"
        className={buttonClass}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus aria-hidden size={14} />
      </button>
    </div>
  )
}
