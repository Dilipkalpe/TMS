import { useEffect, useState } from 'react'
import Input, { Select } from './Input'
import Button from './Button'
import { customersApi, vendorsApi } from '../../services/api'

export default function ReportFilterRow({
  showLedger,
  showCustomer,
  showVendor,
  inline = false,
  value,
  onChange,
  onApply,
}) {
  const [customers, setCustomers] = useState([])
  const [vendors, setVendors] = useState([])

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
  }, [showCustomer, showVendor])

  const v = value ?? {}
  const set = (patch) => onChange?.({ ...v, ...patch })

  const customerOptions = [
    { value: '', label: '(All customers)' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]
  const vendorOptions = [
    { value: '', label: '(All vendors)' },
    ...vendors.map((x) => ({ value: x.id, label: x.name })),
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

  if (inline) {
    return (
      <div className="flex flex-wrap items-end gap-3">
        {dateFields}
        {showLedger && (
          <Select
            label="Ledger"
            className="w-[11.5rem] shrink-0"
            value={v.ledger ?? ''}
            onChange={(e) => set({ ledger: e.target.value })}
            options={[
              { value: '', label: '(All)' },
              { value: 'cash', label: 'Cash Account' },
              { value: 'bank', label: 'Bank Account' },
            ]}
          />
        )}
        {showCustomer && (
          <Select
            label="Customer"
            className="min-w-[12rem] flex-1"
            value={v.customerId ?? ''}
            onChange={(e) => set({ customerId: e.target.value })}
            options={customerOptions}
          />
        )}
        {showVendor && (
          <Select
            label="Vendor"
            className="min-w-[12rem] flex-1"
            value={v.vendorId ?? ''}
            onChange={(e) => set({ vendorId: e.target.value })}
            options={vendorOptions}
          />
        )}
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
        {showLedger && (
          <Select
            label="Ledger"
            value={v.ledger ?? ''}
            onChange={(e) => set({ ledger: e.target.value })}
            options={[
              { value: '', label: '(All)' },
              { value: 'cash', label: 'Cash Account' },
              { value: 'bank', label: 'Bank Account' },
            ]}
          />
        )}
        {showCustomer && (
          <Select
            label="Customer"
            value={v.customerId ?? ''}
            onChange={(e) => set({ customerId: e.target.value })}
            options={customerOptions}
          />
        )}
        {showVendor && (
          <Select
            label="Vendor"
            value={v.vendorId ?? ''}
            onChange={(e) => set({ vendorId: e.target.value })}
            options={vendorOptions}
          />
        )}
      </div>
      {onApply && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={onApply}>Apply Filters</Button>
        </div>
      )}
    </div>
  )
}
