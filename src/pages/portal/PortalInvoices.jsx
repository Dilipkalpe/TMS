import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, FileText, Search } from 'lucide-react'
import Card from '../../components/ui/Card'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { portalApi } from '../../services/api'
import { PortalEmptyState } from './PortalLayout'

const PAGE_SIZE = 20
const STATUSES = ['All', 'Draft', 'Issued', 'Paid', 'Overdue', 'Cancelled']

export default function PortalInvoices() {
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
      const res = await portalApi.invoices(params)
      setData(res.rows ? res : { rows: Array.isArray(res) ? res : [], total: Array.isArray(res) ? res.length : 0 })
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const rows = data.rows ?? []

  if (loading) return <p className="text-sm text-slate-500">Loading invoices…</p>
  if (!rows.length && !search && !statusFilter) return <PortalEmptyState icon={FileText} title="No invoices">Invoices linked to your account will appear here.</PortalEmptyState>

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Invoices</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by invoice number or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s === 'All' ? '' : s}>{s}</option>
          ))}
        </select>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2 text-left">Invoice</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-2 font-medium">{inv.invoiceNo}</td>
                <td className="px-4 py-2">{inv.issuedAt}</td>
                <td className="px-4 py-2">{inv.status}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(inv.totalAmount)}</td>
                <td className="px-4 py-2 text-right">
                  <Link to={`/portal/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Download className="h-3.5 w-3.5" /> View / Print
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No invoices match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-lg border px-2 py-1 text-sm disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages} ({data.total} total)</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-lg border px-2 py-1 text-sm disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
