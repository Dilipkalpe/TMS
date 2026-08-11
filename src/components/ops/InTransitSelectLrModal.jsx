import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Badge from '../ui/Badge'
import { lrOperationsApi } from '../../services/api'
import { MapPin, User } from 'lucide-react'

function mapQueueRow(row) {
  return {
    lrNumber: row.lrNumber,
    customer: row.customer || row.consignor,
    from: row.from,
    to: row.to,
    vehicle: row.vehicle,
    status: row.status || 'In Transit',
  }
}

export default function InTransitSelectLrModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [picked, setPicked] = useState('')
  const [rows, setRows] = useState([])
  const [fetching, setFetching] = useState(false)
  const [search, setSearch] = useState('')

  const loadRows = useCallback(async () => {
    setFetching(true)
    try {
      const queue = await lrOperationsApi.queue('dispatched', { page: 1, pageSize: 100, includeTotal: false })
      setRows((queue.items || []).filter((row) => row.lrNumber).map(mapQueueRow))
    } catch {
      setRows([])
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setPicked('')
    setSearch('')
    loadRows()
  }, [open, loadRows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => [
      row.lrNumber, row.customer, row.from, row.to, row.vehicle, row.status,
    ].some((part) => String(part || '').toLowerCase().includes(q)))
  }, [rows, search])

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-500">
        {picked ? `Selected: ${picked}` : 'Select a dispatched LR to track'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => picked && onConfirm?.(picked)} disabled={!picked || loading}>
          {loading ? 'Loading…' : 'Continue'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Select LR for In Transit" size="lg" footer={footer}>
      <div className="space-y-4">
        <Input
          label="Search"
          placeholder="LR no., customer, vehicle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-[24rem] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
          {fetching && filteredRows.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Loading LRs…</p>
          ) : filteredRows.length === 0 ? (
            <div className="space-y-2 p-4 text-sm text-slate-500">
              <p>No dispatched LRs found.</p>
              <p>Confirm dispatch first, then return here to track the vehicle.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => {
                const active = picked === row.lrNumber
                return (
                  <li key={row.lrNumber}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5 ${active ? 'bg-primary/10' : ''}`}
                      onClick={() => setPicked(row.lrNumber)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-primary">{row.lrNumber}</span>
                          <Badge variant="Pending">{row.status}</Badge>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {row.customer || '—'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {row.from || '—'} → {row.to || '—'}
                          </span>
                          {row.vehicle ? <span>Vehicle: {row.vehicle}</span> : null}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
