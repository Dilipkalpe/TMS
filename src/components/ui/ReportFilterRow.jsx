import Input, { Select } from './Input'

export default function ReportFilterRow({ showLedger, showCustomer, showVendor }) {
  return (
    <div className="grid gap-2 border-t border-primary/10 pt-2 sm:grid-cols-2 lg:grid-cols-4">
      <Input label="From Date" type="date" defaultValue="2026-06-01" />
      <Input label="To Date" type="date" defaultValue="2026-06-18" />
      {showLedger && <Select label="Ledger" options={['(All)', 'Cash Account', 'Bank Account', 'Customer Ledger']} />}
      {showCustomer && <Select label="Customer" options={['(All)', 'Reliance Logistics', 'Tata Steel Ltd']} />}
      {showVendor && <Select label="Vendor" options={['(All)', 'Indian Oil Corporation', 'MRF Tyres Ltd']} />}
    </div>
  )
}
