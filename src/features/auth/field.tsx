import { useId, type ReactNode } from 'react'

interface FieldRenderProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  className: string
}

/**
 * Every form control in the app goes through here so that the label, the error
 * message and the control stay wired together (`aria-describedby`,
 * `aria-invalid`) without each form re-implementing it.
 */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: (props: FieldRenderProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        className:
          'w-full rounded-sm border border-line bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-clay aria-[invalid=true]:border-danger',
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
