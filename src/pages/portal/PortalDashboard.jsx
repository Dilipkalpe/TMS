import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, MapPin, Package, Search, Truck } from 'lucide-react'
import Card from '../../components/ui/Card'
import { Select } from '../../components/ui/Input'
import { portalApi } from '../../services/api'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { PortalEmptyState } from './PortalLayout'
import { usePortalAuth } from '../../context/PortalAuthContext'

const statusTone = {
  Delivered: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  'In Transit': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Confirmed: 'bg-indigo-100 text-indigo-800',
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

const STATUSES = ['All', 'Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled']
const PAGE_SIZE = 20

export default function PortalDashboard() {
  const { profile } = usePortalAuth()
  const [data, setData] = useState({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize: PAGE_SIZE }
      if (debouncedSearch) params.search = debouncedSearch
      if (statusFilter) params.status = statusFilter
      const res = await portalApi.shipments(params)
      setData(res.rows ? res : { rows: Array.isArray(res) ? res : [], total: Array.isArray(res) ? res.length : 0 })
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const rows = data.rows ?? []

  const stats = useMemo(() => ({
    total: data.total ?? rows.length,
    active: rows.filter((r) => !['Delivered', 'Cancelled'].includes(r.status)).length,
    delivered: rows.filter((r) => r.status === 'Delivered').length,
  }), [rows, data.total])

  if (profile?.scope === 'booking' && profile.bookingId) {
    return <Navigate to={`/portal/track/${profile.bookingId}`} replace />
  }

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-white to-accent/5 p-5 dark:from-primary/20 dark:via-slate-900">
        <p className="text-sm text-slate-500">Welcome back</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">{profile?.name ?? 'Customer'}</h1>
        <p className="mt-1 text-sm text-slate-500">Track live GPS, ETA, proof of delivery, and invoices</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ['Total shipments', stats.total, Package],
          ['In progress', stats.active, Truck],
          ['Delivered', stats.delivered, Clock],
        ].map(([label, val, Icon]) => (
          <Card key={label} className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold">{val}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by ID, city, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <Select
          label={false}
          className="min-w-[9rem]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUSES.map((s) => ({ value: s === 'All' ? '' : s, label: s }))}
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading your shipments…</p>
      ) : !rows.length ? (
        <PortalEmptyState title="No shipments found">
          {search || statusFilter ? 'Try adjusting your search or filters.' : 'Your active bookings will appear here once dispatched.'}
        </PortalEmptyState>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">My shipments</h2>
          <div className="space-y-3">
            {rows.map((s) => (
              <Card key={s.id} className="p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.shipmentCode ?? s.id}</p>
                    <p className="text-sm text-slate-500">{s.origin} → {s.destination}</p>
                    <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone[s.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-primary">{formatCurrency(s.freightAmount)}</p>
                    {s.vehicleNumber && <p className="text-slate-500">{s.vehicleNumber}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/portal/track/${s.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                  >
                    <MapPin className="h-3 w-3" /> Track live
                  </Link>
                  {s.hasPod && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                      <Package className="h-3 w-3" /> POD ready
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border px-2 py-1 text-sm disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border px-2 py-1 text-sm disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
