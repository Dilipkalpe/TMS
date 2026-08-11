import { useMemo } from 'react'
import { Select } from './Input'
import { useBranch } from '../../context/BranchContext'

/** Dropdown bound to branch master (stores branch name in form state). */
export default function BranchSelect({
  label,
  value = '',
  onChange,
  placeholder = 'Select branch…',
  required = false,
  error,
  className = '',
  disabled = false,
  id,
}) {
  const { branches, loading } = useBranch()

  const options = useMemo(() => {
    const rows = branches.map((b) => {
      const name = b.name || b.code || ''
      return {
        value: name,
        label: b.code && b.name ? `${b.code} — ${b.name}` : name,
      }
    })
    if (value && !rows.some((r) => r.value === value)) {
      rows.unshift({ value, label: value })
    }
    return [{ value: '', label: loading ? 'Loading branches…' : placeholder }, ...rows]
  }, [branches, loading, placeholder, value])

  return (
    <div className={className}>
      <Select
        id={id}
        label={label}
        options={options}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || loading}
        required={required}
        error={error}
      />
    </div>
  )
}
