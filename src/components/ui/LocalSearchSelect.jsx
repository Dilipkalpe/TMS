import { useEffect, useRef, useState } from 'react'

/**
 * Searchable dropdown for a static in-memory option list (max 10 shown).
 */
export default function LocalSearchSelect({
  label,
  options = [],
  value = '',
  onChange,
  placeholder = 'Type to search…',
  className = '',
  limit = 10,
  getOptionValue = (opt) => opt.value ?? opt,
  getOptionLabel = (opt) => opt.label ?? opt,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const selectedLabel = (() => {
    const match = options.find((o) => getOptionValue(o) === value)
    return match ? getOptionLabel(match) : value
  })()

  useEffect(() => {
    setQuery(selectedLabel ?? '')
  }, [value, selectedLabel])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = options
    .filter((opt) => {
      if (!q) return true
      return String(getOptionLabel(opt)).toLowerCase().includes(q)
    })
    .slice(0, limit)

  const pick = (opt) => {
    const val = getOptionValue(opt)
    onChange?.(val)
    setQuery(getOptionLabel(opt))
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          )}
          {filtered.map((opt) => (
            <li key={getOptionValue(opt)}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-primary/10 dark:text-slate-100 dark:hover:bg-primary/20"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                {getOptionLabel(opt)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
