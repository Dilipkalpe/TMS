import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import Input, { Select } from './Input'
import Button from './Button'
import SlideDrawer from './SlideDrawer'
import { branchesApi, customersApi, vendorsApi } from '../../services/api'
import {
  DELIVERY_POD_STATUSES,
  HUB_MANIFEST_STATUSES,
  LR_REPORT_STATUSES,
  WORKFLOW_OPTIONS,
} from '../../utils/reportQuery'

function emptyFilters() {
  return {
    fromDate: '',
    toDate: '',
    ledger: '',
    customerId: '',
    vendorId: '',
    status: '',
    vehicle: '',
    hubBranchId: '',
    workflow: '',
  }
}

function formatDisplayDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function countActiveFilters(v = {}) {
  let n = 0
  if (v.fromDate) n += 1
  if (v.toDate) n += 1
  if (v.ledger) n += 1
  if (v.customerId) n += 1
  if (v.vendorId) n += 1
  if (v.status) n += 1
  if (v.vehicle) n += 1
  if (v.hubBranchId) n += 1
  if (v.workflow) n += 1
  return n
}

function summarizeFilters(v = {}) {
  const parts = []
  if (v.fromDate || v.toDate) {
    parts.push(`${formatDisplayDate(v.fromDate) || '…'} – ${formatDisplayDate(v.toDate) || '…'}`)
  }
  if (v.status) parts.push(v.status)
  if (v.workflow) {
    const label = WORKFLOW_OPTIONS.find((o) => o.value === v.workflow)?.label ?? v.workflow
    parts.push(label)
  }
  if (v.vehicle) parts.push(v.vehicle)
  return parts.join(' · ')
}

/**
 * Shared report/register filters: Filter button opens a right-side panel.
 * `inline` is accepted for backward compatibility but uses the same drawer UX.
 */
export default function ReportFilterRow({
  showLedger,
  showCustomer,
  showVendor,
  showStatus,
  showVehicle,
  showHub,
  showWorkflow,
  statusOptions,
  inline: _inline = false,
  value,
  onChange,
  onApply,
  title = 'Filters',
}) {
  const applied = value ?? emptyFilters()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(applied)
  const [customers, setCustomers] = useState([])
  const [vendors, setVendors] = useState([])
  const [hubs, setHubs] = useState([])

  useEffect(() => {
    if (showCustomer) {
      customersApi.list({ page: 1, pageSize: 500 })
        .then((res) => setCustomers(res?.items ?? (Array.isArray(res) ? res : [])))
        .catch(() => setCustomers([]))
    }
    if (showVendor) {
      vendorsApi.list({ page: 1, pageSize: 500 })
        .then((res) => setVendors(res?.items ?? (Array.isArray(res) ? res : [])))
        .catch(() => setVendors([]))
    }
    if (showHub) {
      branchesApi.list(true)
        .then((res) => setHubs(Array.isArray(res) ? res : (res?.items ?? [])))
        .catch(() => setHubs([]))
    }
  }, [showCustomer, showVendor, showHub])

  useEffect(() => {
    if (!open) return
    setDraft({ ...emptyFilters(), ...(value ?? {}) })
  }, [open, value])

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }))

  const resolvedStatuses = statusOptions
    ?? (showStatus === 'hub'
      ? HUB_MANIFEST_STATUSES
      : showStatus === 'delivery'
        ? DELIVERY_POD_STATUSES
        : LR_REPORT_STATUSES)

  const customerOptions = useMemo(() => [
    { value: '', label: '(All customers)' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ], [customers])

  const vendorOptions = useMemo(() => [
    { value: '', label: '(All vendors)' },
    ...vendors.map((x) => ({ value: x.id, label: x.name })),
  ], [vendors])

  const statusSelectOptions = useMemo(() => [
    { value: '', label: '(All statuses)' },
    ...resolvedStatuses.map((s) => ({ value: s, label: s })),
  ], [resolvedStatuses])

  const hubOptions = useMemo(() => [
    { value: '', label: '(All hubs)' },
    ...hubs.map((b) => ({ value: b.id, label: b.name })),
  ], [hubs])

  const activeCount = countActiveFilters(applied)
  const summary = summarizeFilters(applied)

  const handleClose = () => setOpen(false)

  const handleApply = () => {
    const result = onApply?.(draft)
    if (result === false) return
    onChange?.(draft)
    setOpen(false)
  }

  const filterBtnClass = activeCount > 0
    ? 'inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/15 sm:text-sm'
    : 'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary/30 hover:bg-slate-50 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={filterBtnClass} onClick={() => setOpen(true)}>
          <Filter className="h-4 w-4" />
          Filter
          {activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
        {summary ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{summary}</p>
        ) : null}
      </div>

      <SlideDrawer
        open={open}
        onClose={handleClose}
        title={title}
        width="md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" onClick={handleApply}>Apply Filters</Button>
          </div>
        )}
      >
        <div className="grid gap-3">
          <Input
            label="From Date"
            type="date"
            value={draft.fromDate ?? ''}
            onChange={(e) => set({ fromDate: e.target.value })}
          />
          <Input
            label="To Date"
            type="date"
            value={draft.toDate ?? ''}
            onChange={(e) => set({ toDate: e.target.value })}
          />
          {showLedger && (
            <Select
              label="Ledger"
              value={draft.ledger ?? ''}
              onChange={(e) => set({ ledger: e.target.value })}
              options={[
                { value: '', label: '(All)' },
                { value: 'cash', label: 'Cash Account' },
                { value: 'bank', label: 'Bank Account' },
              ]}
            />
          )}
          {showStatus && (
            <Select
              label="Status"
              value={draft.status ?? ''}
              onChange={(e) => set({ status: e.target.value })}
              options={statusSelectOptions}
            />
          )}
          {showWorkflow && (
            <Select
              label="Workflow"
              value={draft.workflow ?? ''}
              onChange={(e) => set({ workflow: e.target.value })}
              options={[
                { value: '', label: '(All workflows)' },
                ...WORKFLOW_OPTIONS,
              ]}
            />
          )}
          {showVehicle && (
            <Input
              label="Vehicle"
              placeholder="Vehicle no."
              value={draft.vehicle ?? ''}
              onChange={(e) => set({ vehicle: e.target.value })}
            />
          )}
          {showHub && (
            <Select
              label="Hub"
              value={draft.hubBranchId ?? ''}
              onChange={(e) => set({ hubBranchId: e.target.value })}
              options={hubOptions}
            />
          )}
          {showCustomer && (
            <Select
              label="Customer"
              value={draft.customerId ?? ''}
              onChange={(e) => set({ customerId: e.target.value })}
              options={customerOptions}
            />
          )}
          {showVendor && (
            <Select
              label="Vendor"
              value={draft.vendorId ?? ''}
              onChange={(e) => set({ vendorId: e.target.value })}
              options={vendorOptions}
            />
          )}
        </div>
      </SlideDrawer>
    </>
  )
}
