import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import { voucherTypes } from '../../data/accounting'
import { Save } from 'lucide-react'

function VoucherForm({ type }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input label="Voucher Number" defaultValue={`${type.split(' ')[0].toUpperCase()}-2026-0113`} />
      <Input label="Date" type="date" defaultValue="2026-06-18" />
      <Select label="Debit Ledger" options={['Select Ledger', 'Cash Account', 'Bank Account', 'Fuel Expense', 'Salary Expense']} />
      <Select label="Credit Ledger" options={['Select Ledger', 'Customer Ledger', 'Vendor Ledger', 'Freight Income']} />
      <Input label="Amount (₹)" type="number" placeholder="0" />
      <div className="sm:col-span-2 lg:col-span-3">
        <Textarea label="Narration" placeholder="Enter narration..." />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button icon={Save}>Save {type}</Button>
      </div>
    </div>
  )
}

export default function VoucherEntry() {
  const tabs = voucherTypes.map((type) => ({
    id: type,
    label: type.replace(' Voucher', ''),
    content: <VoucherForm type={type} />,
  }))

  return (
    <ERPContentPage module="Accounting" title="Voucher Entry">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !p-2.5 sm:!p-3">
        <CardHeader title="Create Voucher" />
        <Tabs fill tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
