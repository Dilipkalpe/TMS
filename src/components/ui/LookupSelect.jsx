import { useCallback, useEffect, useRef, useState } from 'react'
import { lookupsApi } from '../../services/api'
import { lookupEntityLabel, resolveQuickCreatePayload } from '../../config/lookupLabels'
import { invalidateSearchIndex } from '../../utils/searchIndex'
import { LOOKUP_CREATED_EVENT, lookupEventMatches, notifyLookupCreated } from '../../utils/lookupEvents'
import Modal from './Modal'
import Button from './Button'
import { useToast } from '../../context/ToastContext'

const FETCHERS = {
  vehicles: lookupsApi.vehicles,
  drivers: lookupsApi.drivers,
  customers: lookupsApi.customers,
  vendors: lookupsApi.vendors,
}

async function fetchDriverOptions(search, limit) {
  const [employees, drivers] = await Promise.all([
    lookupsApi.employees('Driver', search, limit).catch(() => []),
    lookupsApi.drivers(search, limit).catch(() => []),
  ])
  const merged = [...new Set([...(employees ?? []), ...(drivers ?? [])])]
  return merged.sort((a, b) => a.localeCompare(b)).slice(0, limit)
}

function withCurrentValue(list, current, limit) {
  const v = current?.trim()
  if (!v) return list
  if (list.some((o) => o.toLowerCase() === v.toLowerCase())) return list
  return [v, ...list].slice(0, limit)
}

function matchesOption(options, text) {
  const q = text.trim().toLowerCase()
  return options.find((o) => o.toLowerCase() === q) ?? null
}

/**
 * Searchable lookup dropdown with inline quick-create on Enter / Tab when no match exists.
 */
export default function LookupSelect({
  label,
  type,
  employeeType,
  value = '',
  onChange,
  onRecordCreated,
  placeholder = 'Type to search…',
  className = '',
  limit = 10,
  allowCreate = true,
}) {
  const fetcher = type === 'employees'
    ? (search, cap) => (
      employeeType === 'Driver'
        ? fetchDriverOptions(search, cap)
        : lookupsApi.employees(employeeType, search, cap)
    )
    : FETCHERS[type]

  const [query, setQuery] = useState(value ?? '')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingName, setPendingName] = useState('')
  const [creating, setCreating] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const skipBlurRef = useRef(false)
  const { toast } = useToast()

  const loadOptions = useCallback(async (searchText) => {
    if (!fetcher) return []
    setLoading(true)
    try {
      const items = await fetcher(searchText, limit)
      const list = withCurrentValue(
        Array.isArray(items) ? items.slice(0, limit) : [],
        value,
        limit,
      )
      setOptions(list)
      return list
    } catch {
      const fallback = withCurrentValue([], value, limit)
      setOptions(fallback)
      return fallback
    } finally {
      setLoading(false)
    }
  }, [fetcher, limit, value])

  useEffect(() => {
    setQuery(value ?? '')
    if (value?.trim()) {
      setOptions((prev) => withCurrentValue(prev, value, limit))
    }
  }, [value, limit])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => loadOptions(query), 250)
    return () => clearTimeout(t)
  }, [open, query, loadOptions, refreshToken])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const onCreated = (e) => {
      if (!lookupEventMatches(e.detail, type, employeeType)) return
      setRefreshToken((n) => n + 1)
      if (e.detail?.label) {
        setOptions((prev) => {
          const label = e.detail.label
          if (prev.some((o) => o.toLowerCase() === label.toLowerCase())) return prev
          return [...prev, label].sort((a, b) => a.localeCompare(b))
        })
      }
    }
    window.addEventListener(LOOKUP_CREATED_EVENT, onCreated)
    return () => window.removeEventListener(LOOKUP_CREATED_EVENT, onCreated)
  }, [type, employeeType])

  const pick = (item) => {
    onChange?.(item)
    setQuery(item)
    setOpen(false)
    setConfirmOpen(false)
    setPendingName('')
  }

  const offerCreate = (text) => {
    setPendingName(text.trim())
    setConfirmOpen(true)
    setOpen(false)
  }

  const commitValue = async (text, { fromTab = false } = {}) => {
    const trimmed = text.trim()
    if (!trimmed) {
      onChange?.('')
      setOpen(false)
      return true
    }

    const fresh = await loadOptions(trimmed)
    const exact = matchesOption(fresh, trimmed) ?? matchesOption(options, trimmed)
    if (exact) {
      pick(exact)
      return true
    }

    if (value && value.toLowerCase() === trimmed.toLowerCase()) {
      setOpen(false)
      return true
    }

    if (!allowCreate || !type) {
      onChange?.(trimmed)
      setQuery(trimmed)
      setOpen(false)
      return true
    }

    if (fromTab) skipBlurRef.current = true
    offerCreate(trimmed)
    return false
  }

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      await commitValue(query)
    } else if (e.key === 'Tab' && !e.shiftKey) {
      const ok = await commitValue(query, { fromTab: true })
      if (!ok) e.preventDefault()
    }
  }

  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false
      return
    }
    if (confirmOpen || creating) return
    const trimmed = query.trim()
    if (!trimmed) {
      setOpen(false)
      return
    }
    const exact = matchesOption(options, trimmed)
    if (exact) pick(exact)
    else setOpen(false)
  }

  const handleConfirmCreate = async () => {
    if (!pendingName) return
    setCreating(true)
    try {
      const { type: createType, employeeType: createRole } = resolveQuickCreatePayload(type, employeeType)
      const result = await lookupsApi.quickCreate(createType, pendingName, createRole)
      const label = result.label ?? pendingName
      invalidateSearchIndex()
      notifyLookupCreated({ type, employeeType, label, id: result.id, created: result.created })
      await loadOptions(label)
      pick(label)
      onRecordCreated?.(result)
      toast({
        title: result.created ? `${entityLabel} added` : `${entityLabel} selected`,
        message: label,
        type: 'success',
      })
    } catch (err) {
      toast({ title: 'Could not add record', message: err.message, type: 'error' })
      setConfirmOpen(false)
      setPendingName('')
      inputRef.current?.focus()
    } finally {
      setCreating(false)
    }
  }

  const handleDeclineCreate = () => {
    setConfirmOpen(false)
    setPendingName('')
    inputRef.current?.focus()
  }

  const entityLabel = lookupEntityLabel(type, employeeType)

  return (
    <>
      <div ref={wrapRef} className={`relative ${className}`}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange?.('')
          }}
          onFocus={() => {
            setOpen(true)
            loadOptions(query)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {open && (
          <ul
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            role="listbox"
          >
            {loading && (
              <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
            )}
            {!loading && options.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">
                {allowCreate && query.trim()
                  ? 'No matches — press Enter to add'
                  : 'No matches'}
              </li>
            )}
            {!loading && options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-primary/10 dark:text-slate-100 dark:hover:bg-primary/20"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={handleDeclineCreate}
        title="Add new record"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleDeclineCreate} disabled={creating}>
              No
            </Button>
            <Button size="sm" onClick={handleConfirmCreate} disabled={creating}>
              {creating ? 'Adding…' : 'Yes, add it'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <strong>{pendingName}</strong> — this {entityLabel.toLowerCase()} does not exist. Would you like to add it?
        </p>
      </Modal>
    </>
  )
}
