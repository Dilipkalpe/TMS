/** Shared form label — renders trailing `*` in red (required field indicator). */
export function formatRequiredLabel(label, { required = false } = {}) {
  if (label == null || label === false) return null
  if (typeof label !== 'string') return label

  const trimmed = label.trimEnd()
  const hasTrailingStar = /\s*\*$/.test(trimmed)

  if (hasTrailingStar) {
    const text = trimmed.replace(/\s*\*$/, '').trimEnd()
    return (
      <>
        {text}
        {' '}
        <span className="required-mark" aria-hidden="true">*</span>
      </>
    )
  }

  if (required) {
    return (
      <>
        {label}
        {' '}
        <span className="required-mark" aria-hidden="true">*</span>
      </>
    )
  }

  return label
}

export default function FormLabel({
  children,
  className = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300',
  htmlFor,
  required = false,
}) {
  const content = formatRequiredLabel(children, { required })
  if (content == null) return null

  return (
    <label htmlFor={htmlFor} className={className}>
      {content}
    </label>
  )
}
