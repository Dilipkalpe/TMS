import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection } from '../../components/ops/OpsFormParts'
import { Wallet, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useToast } from '../../context/ToastContext'

const DEFAULT_EXPENSES = [
  { id: 1, type: 'Diesel', date: '2025-05-06', billNo: 'FUEL-4587', description: 'Diesel at Pune', amount: 3500 },
  { id: 2, type: 'Toll', date: '2025-05-06', billNo: 'TOLL-123', description: 'Mumbai-Pune toll', amount: 850 },
  { id: 3, type: 'Hamali', date: '2025-05-07', billNo: 'HAM-01', description: 'Loading hamali', amount: 900 },
]

export default function TripExpensesEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES)
  const [form, setForm] = useState({
    tripNo: 'TRP25050045', vehicle: 'MH12AB1234', driver: 'Suresh Patil',
    from: 'Pune', to: 'Nagpur', startDate: '2025-05-06', endDate: '2025-05-08', totalKm: 820,
    lrRef: 'LR250500101', customer: 'Techno Electricals', freightAmount: 8850,
    advanceTaken: 2000, advanceDate: '2025-05-06', givenBy: 'Admin User', advanceRemarks: 'Trip advance',
    reimbursed: 3000, settlementDate: '2025-05-09', paidTo: 'Suresh Patil', paymentMode: 'Cash',
    settlementRemarks: 'Balance paid in cash',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const balance = totalExpenses - Number(form.advanceTaken || 0)
  const payable = balance - Number(form.reimbursed || 0)

  return (
    <ERPContentPage module="Operations" title="Trip Expenses" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader title="Trip Expenses" breadcrumb="Home / Trip Expenses / Add" />

        <div className="grid shrink-0 gap-1 lg:grid-cols-3">
          <OpsSection title="Trip Information" icon={Wallet}>
            <OpsGrid cols={2}>
              <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
              <Input label="Vehicle No." value={form.vehicle} onChange={(e) => u('vehicle', e.target.value)} />
              <Input label="Driver" value={form.driver} onChange={(e) => u('driver', e.target.value)} />
              <Input label="Total KM" type="number" value={form.totalKm} onChange={(e) => u('totalKm', e.target.value)} />
              <Select label="From" options={['Pune', 'Mumbai']} value={form.from} onChange={(e) => u('from', e.target.value)} />
              <Select label="To" options={['Nagpur', 'Delhi']} value={form.to} onChange={(e) => u('to', e.target.value)} />
              <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => u('startDate', e.target.value)} />
              <Input label="End Date" type="date" value={form.endDate} onChange={(e) => u('endDate', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Additional Information">
            <OpsGrid cols={2}>
              <Input label="LR / Consignment" value={form.lrRef} onChange={(e) => u('lrRef', e.target.value)} />
              <Input label="Customer" value={form.customer} onChange={(e) => u('customer', e.target.value)} />
              <Input label="Freight Amount" readOnly value={formatCurrency(form.freightAmount)} />
              <div className="flex items-end"><Badge variant="Paid">Completed</Badge></div>
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Expense Summary">
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between"><dt>Total Expenses</dt><dd>{formatCurrency(totalExpenses)}</dd></div>
              <div className="flex justify-between"><dt>Advance Taken</dt><dd>{formatCurrency(form.advanceTaken)}</dd></div>
              <div className="flex justify-between"><dt>Balance Expenses</dt><dd>{formatCurrency(balance)}</dd></div>
              <div className="flex justify-between"><dt>Reimbursed</dt><dd>{formatCurrency(form.reimbursed)}</dd></div>
              <div className="flex justify-between border-t pt-1 font-bold text-primary"><dt>Payable to Driver</dt><dd>{formatCurrency(payable)}</dd></div>
            </dl>
          </OpsSection>
        </div>

        <OpsSection title="Expense Details" className="flex min-h-0 flex-1 flex-col overflow-hidden"
          action={<Button size="sm" icon={Plus} onClick={() => setExpenses((r) => [...r, { id: Date.now(), type: 'Other', date: '', billNo: '', description: '', amount: 0 }])}>+ Add Expense</Button>}
        >
          <div className="lr-entry-items-scroll">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-primary text-white">
                <tr>
                  {['#', 'Expense Type', 'Date', 'Bill No.', 'Description', 'Amount (₹)', 'Action'].map((h) => (
                    <th key={h} className="px-1 py-1 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, idx) => (
                  <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-1 py-0.5">{idx + 1}</td>
                    <td className="px-1 py-0.5">{e.type}</td>
                    <td className="px-1 py-0.5">{e.date}</td>
                    <td className="px-1 py-0.5">{e.billNo}</td>
                    <td className="px-1 py-0.5">{e.description}</td>
                    <td className="px-1 py-0.5 font-semibold">{formatCurrency(e.amount)}</td>
                    <td className="px-1 py-0.5"><button type="button" className="text-red-500" onClick={() => setExpenses((r) => r.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold dark:bg-slate-900">
                <tr><td colSpan={5} className="px-1 py-1 text-right">Total Expenses</td><td className="px-1 py-1">{formatCurrency(totalExpenses)}</td><td /></tr>
              </tfoot>
            </table>
          </div>
        </OpsSection>

        <OpsGrid cols={3}>
          <OpsSection title="Advance Information">
            <OpsGrid cols={2}>
              <Input label="Advance Taken (₹)" type="number" value={form.advanceTaken} onChange={(e) => u('advanceTaken', e.target.value)} />
              <Input label="Advance Date" type="date" value={form.advanceDate} onChange={(e) => u('advanceDate', e.target.value)} />
              <Input label="Given By" value={form.givenBy} onChange={(e) => u('givenBy', e.target.value)} />
            </OpsGrid>
            <Textarea label="Remarks" rows={1} value={form.advanceRemarks} onChange={(e) => u('advanceRemarks', e.target.value)} />
          </OpsSection>
          <OpsSection title="Payment / Settlement">
            <OpsGrid cols={2}>
              <Input label="Reimbursed (₹)" type="number" value={form.reimbursed} onChange={(e) => u('reimbursed', e.target.value)} />
              <Input label="Settlement Date" type="date" value={form.settlementDate} onChange={(e) => u('settlementDate', e.target.value)} />
              <Input label="Paid To" value={form.paidTo} onChange={(e) => u('paidTo', e.target.value)} />
              <Select label="Payment Mode" options={['Cash', 'Bank Transfer', 'UPI']} value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} />
            </OpsGrid>
            <Textarea label="Remarks" rows={1} value={form.settlementRemarks} onChange={(e) => u('settlementRemarks', e.target.value)} />
          </OpsSection>
          <OpsSection title="Documents">
            <p className="text-[10px]">Fuel Bill.pdf · Toll Receipt.pdf</p>
            <Button size="sm" variant="outline" className="mt-1">+ Upload More</Button>
          </OpsSection>
        </OpsGrid>

        <OpsFooter
          onCancel={() => navigate('/lr?status=expense-pending')}
          onSave={() => toast({ title: 'Trip expenses saved', type: 'success' })}
          onSavePrint={() => toast({ title: 'Saved & Print', type: 'success' })}
        />
      </div>
    </ERPContentPage>
  )
}
