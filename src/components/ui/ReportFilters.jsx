import { Search, Filter } from 'lucide-react'
import Input, { Select } from './Input'
import Button from './Button'

export default function ReportFilters({
  showLedger = false,
  showCustomer = false,
  showVendor = false,
  onPrint,
  onExportPdf,
  onExportExcel,
}) {
  return (
    <div className="rounded-[12px] border border-slate-200/80 bg-white p-2.5 sm:p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        <Input label="From Date" type="date" defaultValue="2026-06-01" />
        <Input label="To Date" type="date" defaultValue="2026-06-18" />
        {showLedger && (
          <Select
            label="Ledger"
            options={['All Ledgers', 'Cash Account', 'Bank Account', 'Customer Ledger', 'Vendor Ledger']}
          />
        )}
        {showCustomer && (
          <Select label="Customer" options={['All Customers', 'Reliance Logistics', 'Tata Steel Ltd', 'Adani Ports']} />
        )}
        {showVendor && (
          <Select label="Vendor" options={['All Vendors', 'Indian Oil Corporation', 'MRF Tyres Ltd']} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
        <Button icon={Search} size="sm">Search</Button>
        <Button icon={Filter} variant="outline" size="sm">Filter</Button>
        {onPrint && <Button variant="outline" size="sm" onClick={onPrint}>Print</Button>}
        {onExportPdf && <Button variant="outline" size="sm" onClick={onExportPdf}>Export PDF</Button>}
        {onExportExcel && <Button variant="outline" size="sm" onClick={onExportExcel}>Export Excel</Button>}
      </div>
    </div>
  )
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number') return amount
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}
