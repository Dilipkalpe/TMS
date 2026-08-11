import { useMemo, useState } from 'react'
import LocalSearchSelect from './LocalSearchSelect'

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500'
            : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

/**
 * App-wide dropdown — same OutlinedField + SearchableDropdownPanel pattern as
 * Consignor (From) on New LR Entry (PartyMasterSelect / LocalSearchSelect).
 * Preserves native-select-like onChange: e.target.value
 */
export function Select({
  label,
  error,
  options = [],
  className = '',
  selectClassName: _selectClassName = '',
  value,
  defaultValue,
  onChange,
  disabled = false,
  id,
  required = false,
  name,
  placeholder,
  ...rest
}) {
  const normalized = useMemo(
    () => options.map((opt) => (
      typeof opt === 'object' && opt !== null
        ? { value: opt.value ?? '', label: opt.label ?? String(opt.value ?? '') }
        : { value: opt, label: String(opt) }
    )),
    [options],
  )

  const emptyLabel = normalized.find((o) => o.value === '' || o.value == null)?.label
  const resolvedPlaceholder = placeholder
    || (emptyLabel && emptyLabel !== '' ? emptyLabel : undefined)
    || 'Select…'

  const isControlled = value !== undefined
  // Do not auto-select the first option — empty until the user explicitly picks.
  const [internal, setInternal] = useState(() => (
    defaultValue !== undefined ? defaultValue : ''
  ))
  const current = isControlled ? value : internal

  return (
    <LocalSearchSelect
      label={label}
      error={error}
      options={normalized}
      value={current ?? ''}
      placeholder={resolvedPlaceholder}
      className={className}
      disabled={disabled}
      id={id}
      required={required}
      name={name}
      onChange={(val) => {
        if (!isControlled) setInternal(val)
        onChange?.({
          target: { value: val, name: name ?? '', id: id ?? '' },
          currentTarget: { value: val, name: name ?? '', id: id ?? '' },
        })
      }}
      {...rest}
    />
  )
}

export function Textarea({ label, className = '', rows = 3, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        {...props}
      />
    </div>
  )
}
