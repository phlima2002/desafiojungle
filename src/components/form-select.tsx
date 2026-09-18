import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Ponte entre o `Select` do shadcn/ui (que é um menu do Radix, não um
 * `<select>` nativo) e o react-hook-form: o Radix comunica o valor por callback,
 * então o campo precisa de um `Controller` em vez de `register`.
 *
 * Fica aqui, e não em `components/ui`, porque é código da aplicação — os
 * arquivos de `components/ui` são os componentes do shadcn/ui como eles vêm.
 */
export function FormSelect<TValues extends FieldValues>({
  control,
  name,
  options,
  id,
  size = 'default',
  'aria-label': ariaLabel,
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
  className,
}: {
  control: Control<TValues>
  name: FieldPath<TValues>
  options: ReadonlyArray<{ value: string; label: string }>
  id?: string
  size?: 'sm' | 'default'
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  className?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value ?? ''} onValueChange={field.onChange}>
          <SelectTrigger
            id={id}
            size={size}
            className={className}
            aria-label={ariaLabel}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            onBlur={field.onBlur}
            ref={field.ref}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}
