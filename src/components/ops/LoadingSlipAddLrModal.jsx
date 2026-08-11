import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Badge from '../ui/Badge'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrOperationsApi } from '../../services/api'
import { CheckSquare, Square, User, MapPin } from 'lucide-react'

export default function LoadingSlipAddLrModal({
  open,
  onClose,
  onConfirm,
  excludeLrNumbers = [],
  loading = false,
}) {
  const [mode, setMode] = useState('single')
  const [picked, setPicked] = useState([])

  const paged = usePagedApiResource(
    ({ page, pageSize, search: q }) =>
      lrOperationsApi.queue('loading-pending', buildListParams({ page, pageSize, search: q })),
    [open],
  )

  useEffect(() => {
    if (!open) return
    setMode('single')
    setPicked([])
    paged.setSearch('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const excludeSet = useMemo(
    () => new Set(excludeLrNumbers.map((n) => n.toLowerCase())),
    [excludeLrNumbers],
  )

  const available = useMemo(
    () => paged.items.filter((r) => !excludeSet.has(r.lrNumber?.toLowerCase())),
    [paged.items, excludeSet],
  )

  const togglePick = useCallback((lrNumber) => {
    setPicked((prev) =>
      prev.includes(lrNumber) ? prev.filter((x) => x !== lrNumber) : [...prev, lrNumber],
    )
  }, [])

  const selectSingle = useCallback((lrNumber) => {
    setPicked([lrNumber])
  }, [])

  const handleConfirm = () => {
    if (picked.length === 0) return
    onConfirm?.(mode === 'single' ? [picked[0]] : picked)
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-500">
        {mode === 'multiple'
          ? `${picked.length} LR${picked.length === 1 ? '' : 's'} selected`
          : picked[0] ? `Selected: ${picked[0]}` : 'Select an LR'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={picked.length === 0 || loading}>
          {loading ? 'Adding…' : 'Add to Loading Slip'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Add LR" size="lg" footer={footer}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={mode === 'single' ? 'primary' : 'outline'}
            onClick={() => { setMode('single'); setPicked([]) }}
          >
            Single LR
          </Button>
          <Button
            size="sm"
            variant={mode === 'multiple' ? 'primary' : 'outline'}
            onClick={() => { setMode('multiple'); setPicked([]) }}
          >
            Multiple LR
          </Button>
        </div>

        <Input
          label="Search LR"
          placeholder="LR no., customer, vehicle, route…"
          value={paged.search}
          onChange={(e) => paged.setSearch(e.target.value)}
        />

        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          {paged.loading && (
            <p className="p-4 text-sm text-slate-500">Searching pending LRs…</p>
          )}
          {!paged.loading && available.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No pending LRs found.</p>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {available.map((row) => {
              const selected = picked.includes(row.lrNumber)
              return (
                <li key={row.lrNumber}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-primary/5 ${selected ? 'bg-primary/5' : ''}`}
                    onClick={() => (mode === 'single' ? selectSingle(row.lrNumber) : togglePick(row.lrNumber))}
                  >
                    {mode === 'multiple' ? (
                      selected
                        ? <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        : <Square className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-slate-300'}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary">{row.lrNumber}</span>
                        <Badge variant="Pending">{row.status || 'Pending'}</Badge>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {row.customer || row.consignor || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {row.from} → {row.to}
                        </span>
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
