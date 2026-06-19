import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { searchAll } from '../../utils/searchIndex'

const TYPE_COLORS = {
  Booking: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  LR: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  Vehicle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Driver: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Customer: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  Vendor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export default function GlobalSearch({ className = '' } = {}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()
  const results = searchAll(query)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        ref.current?.querySelector('input')?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = (path) => {
    navigate(path)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active].path)
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search bookings, LR, vehicles… (Ctrl+K)"
        className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:w-80"
      />
      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No results for &quot;{query}&quot;</p>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((r, i) => (
                <li key={r.id + r.type}>
                  <button
                    type="button"
                    onClick={() => go(r.path)}
                    className={`flex w-full items-center space-x-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${i === active ? 'bg-primary/5' : ''}`}
                  >
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[r.type] ?? TYPE_COLORS.Vendor}`}>
                      {r.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.title}</p>
                      <p className="truncate text-xs text-slate-500">{r.subtitle}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
