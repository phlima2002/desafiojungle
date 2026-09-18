import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FieldRenderProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  required?: boolean
}

/**
 * Every form control in the app goes through here so that the label, the error
 * message and the control stay wired together (`aria-describedby`,
 * `aria-invalid`) without each form re-implementing it. The control itself is
 * the caller's (`Input`, `Select`, `textarea`); this owns only the plumbing.
 */
export function Field({
  label,
  error,
  hint,
  required = false,
  children,
}: {
  label: string
  error?: string
  hint?: string
  /** Renders the layout's red asterisk and marks the control as required. */
  required?: boolean
  children: (props: FieldRenderProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      {/* The required marker is drawn with CSS rather than a text node, so the
          label's accessible name stays exactly what the designer wrote. */}
      <Label htmlFor={id} data-required={required || undefined}>
        {label}
      </Label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        required,
      })}
      {hint ? (
        <p id={hintId} className="text-3xs text-clay">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-3xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
