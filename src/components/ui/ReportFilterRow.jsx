import { useEffect, useState } from 'react'
import Input, { Select } from './Input'
import Button from './Button'
import { branchesApi, customersApi, vendorsApi } from '../../services/api'
import {
  DELIVERY_POD_STATUSES,
  HUB_MANIFEST_STATUSES,
  LR_REPORT_STATUSES,
  WORKFLOW_OPTIONS,
} from '../../utils/reportQuery'

export default function ReportFilterRow({
  showLedger,
  showCustomer,
  showVendor,
  showStatus,
  showVehicle,
  showHub,
  showWorkflow,
  statusOptions,
  inline = false,
  value,
  onChange,
  onApply,
}) {
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

  const v = value ?? {}
  const set = (patch) => onChange?.({ ...v, ...patch })

  const resolvedStatuses = statusOptions
    ?? (showStatus === 'hub'
      ? HUB_MANIFEST_STATUSES
      : showStatus === 'delivery'
        ? DELIVERY_POD_STATUSES
        : LR_REPORT_STATUSES)

  const customerOptions = [
    { value: '', label: '(All customers)' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]
  const vendorOptions = [
    { value: '', label: '(All vendors)' },
    ...vendors.map((x) => ({ value: x.id, label: x.name })),
  ]
  const statusSelectOptions = [
    { value: '', label: '(All statuses)' },
    ...resolvedStatuses.map((s) => ({ value: s, label: s })),
  ]
  const hubOptions = [
    { value: '', label: '(All hubs)' },
    ...hubs.map((b) => ({ value: b.id, label: b.name })),
  ]

  const dateFields = (
    <>
      <Input
        label="From Date"
        type="date"
        className={inline ? 'w-[11.5rem] shrink-0' : ''}
        value={v.fromDate ?? ''}
        onChange={(e) => set({ fromDate: e.target.value })}
      />
      <Input
        label="To Date"
        type="date"
        className={inline ? 'w-[11.5rem] shrink-0' : ''}
        value={v.toDate ?? ''}
        onChange={(e) => set({ toDate: e.target.value })}
      />
    </>
  )

  const extraFields = (
    <>
      {showLedger && (
        <Select
          label="Ledger"
          className={inline ? 'w-[11.5rem] shrink-0' : ''}
          value={v.ledger ?? ''}
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
          className={inline ? 'min-w-[12rem] flex-1' : ''}
          value={v.status ?? ''}
          onChange={(e) => set({ status: e.target.value })}
          options={statusSelectOptions}
        />
      )}
      {showWorkflow && (
        <Select
          label="Workflow"
          className={inline ? 'min-w-[12rem] flex-1' : ''}
          value={v.workflow ?? ''}
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
          className={inline ? 'w-[11.5rem] shrink-0' : ''}
          placeholder="Vehicle no."
          value={v.vehicle ?? ''}
          onChange={(e) => set({ vehicle: e.target.value })}
        />
      )}
      {showHub && (
        <Select
          label="Hub"
          className={inline ? 'min-w-[12rem] flex-1' : ''}
          value={v.hubBranchId ?? ''}
          onChange={(e) => set({ hubBranchId: e.target.value })}
          options={hubOptions}
        />
      )}
      {showCustomer && (
        <Select
          label="Customer"
          className={inline ? 'min-w-[12rem] flex-1' : ''}
          value={v.customerId ?? ''}
          onChange={(e) => set({ customerId: e.target.value })}
          options={customerOptions}
        />
      )}
      {showVendor && (
        <Select
          label="Vendor"
          className={inline ? 'min-w-[12rem] flex-1' : ''}
          value={v.vendorId ?? ''}
          onChange={(e) => set({ vendorId: e.target.value })}
          options={vendorOptions}
        />
      )}
    </>
  )

  if (inline) {
    return (
      <div className="flex flex-wrap items-end gap-3">
        {dateFields}
        {extraFields}
        {onApply && (
          <Button size="sm" className="mb-0.5 h-[42px] shrink-0 px-5" onClick={onApply}>
            Apply
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 border-t border-primary/10 pt-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {dateFields}
        {extraFields}
      </div>
      {onApply && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onApply}>Apply Filters</Button>
        </div>
      )}
    </div>
  )
}
