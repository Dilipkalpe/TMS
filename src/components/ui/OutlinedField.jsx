import { formatRequiredLabel } from './FormLabel'

/**
 * Shared field shell for searchable dropdowns / lookups.
 * Format matches Consignor (From) on New LR Entry:
 * bold label above + red required mark + rounded bordered control box.
 */
export default function OutlinedField({
  label,
  required = false,
  error,
  className = '',
  fieldClassName = '',
  multiline = false,
  children,
  htmlFor,
}) {
  const hasLabel = label != null && label !== false
  const dense = typeof fieldClassName === 'string' && fieldClassName.includes('outlined-field--dense')

  return (
    <div className={className}>
      {hasLabel ? (
        <label
          htmlFor={htmlFor}
          className={['outlined-field-label', dense ? 'outlined-field-label--dense' : ''].filter(Boolean).join(' ')}
        >
          {formatRequiredLabel(label, { required })}
        </label>
      ) : null}
      <fieldset
        className={[
          'outlined-field',
          'outlined-field--box',
          multiline && 'outlined-field--textarea',
          error && 'outlined-field--error',
          fieldClassName,
        ].filter(Boolean).join(' ')}
      >
        {children}
      </fieldset>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export const OUTLINED_CONTROL_CLASS = 'outlined-control'
export const OUTLINED_SELECT_CLASS = 'outlined-control outlined-control--select'
