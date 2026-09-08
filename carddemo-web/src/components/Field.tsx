import type { InputHTMLAttributes } from 'react'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onChange?: (v: string) => void
  /** Fixed legacy field length; enforced client-side. */
  length?: number
  /** Reject anything that is not a digit while typing. */
  numeric?: boolean
  /** Highlight as the field that caused the current error. */
  invalid?: boolean
  hint?: string
  readOnly?: boolean
  uppercase?: boolean
}

export function Field({ label, value, onChange, length, numeric, invalid, hint, readOnly, uppercase, id, className, ...rest }: FieldProps) {
  const inputId = id ?? `f-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <label className={`field ${invalid ? 'field-invalid' : ''} ${className ?? ''}`} htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input
          id={inputId}
          value={value}
          readOnly={readOnly || !onChange}
          maxLength={length}
          inputMode={numeric ? 'numeric' : undefined}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            if (!onChange) return
            let v = e.target.value
            if (numeric) v = v.replace(/\D/g, '')
            if (uppercase) v = v.toUpperCase()
            if (length !== undefined) v = v.slice(0, length)
            onChange(v)
          }}
          style={length ? { width: `${Math.max(length, 4) + 2}ch` } : undefined}
          {...rest}
        />
        {hint && <span className="field-hint">{hint}</span>}
      </span>
    </label>
  )
}

interface ReadOnlyProps {
  label: string
  value: string | number
  className?: string
}

export function Value({ label, value, className }: ReadOnlyProps) {
  return (
    <div className={`field field-readonly ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      <span className="field-value">{value === '' ? '\u00a0' : value}</span>
    </div>
  )
}
