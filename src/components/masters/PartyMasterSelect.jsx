import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'

function formatLabel(row) {
  const name = row.companyName || row.name
  const city = row.city ? ` · ${row.city}` : ''
  return `${name}${city}`
}

export default function PartyMasterSelect({
  label,
  api,
  valueId = '',
  displayValue = '',
  onSelect,
  placeholder = 'Search by name, city, GST, mobile…',
  className = '',
  disabled = false,
}) {
  const [query, setQuery] = useState(displayValue || '')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    setQuery(displayValue || '')
  }, [displayValue, valueId])

  const loadOptions = useCallback(async (searchText) => {
    setLoading(true)
    try {
      const res = await api.list({ search: searchText, status: 'Active', page: 1, pageSize: 15 })
      const items = res?.items ?? (Array.isArray(res) ? res : [])
      setOptions(items)
    } catch (err) {
      toast({ title: 'Search failed', message: err.message, type: 'error' })
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [api, toast])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => loadOptions(query), 200)
    return () => clearTimeout(t)
  }, [open, query, loadOptions])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (row) => {
    setQuery(formatLabel(row))
    setOpen(false)
    onSelect?.(row)
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">No active records found</li>
          )}
          {!loading && options.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(row)}
              >
                <span className="font-medium">{formatLabel(row)}</span>
                {row.gst && <span className="ml-2 text-xs text-slate-500">GST {row.gst}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
