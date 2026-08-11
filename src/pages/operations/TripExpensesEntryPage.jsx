import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection } from '../../components/ops/OpsFormParts'
import { OpsExpenseSettlement } from '../../components/ops/OpsPhase2Parts'
import { Wallet, Plus, ArrowLeft, Upload } from 'lucide-react'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { lrProcessApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const EXPENSE_TYPES = ['Diesel', 'Toll', 'Hamali', 'Repair', 'Food', 'Other']

function TripExpensesForm({ lrNumber, lr, process, saving, runSave, reload, onBack }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileRef = useRef(null)
  const [expenses, setExpenses] = useState(process?.expenses || [])
  const [settlement, setSettlement] = useState({
    advanceTaken: '',
    advanceDate: '',
    givenBy: '',
    reimbursed: '',
    settlementDate: '',
    paidTo: lr.driver || '',
    paymentMode: 'Cash',
  })
  const [draft, setDraft] = useState({
    category: 'Diesel',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    billNo: '',
    paymentMode: 'Cash',
  })
  const [pendingBill, setPendingBill] = useState(null)

  useEffect(() => {
    setExpenses(process?.expenses || [])
    const s = process?.expenses?.[0]?.extendedData?.settlement
    if (s) setSettlement((prev) => ({ ...prev, ...s }))
  }, [process?.expenses])

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses])
  const balance = Number(settlement.advanceTaken || 0) - totalExpenses + Number(settlement.reimbursed || 0)

  const addExpense = async () => {
    if (!Number(draft.amount)) return
    await runSave('Expense added', async () => {
      const created = await lrProcessApi.addExpense(lrNumber, {
        category: draft.category,
        amount: Number(draft.amount),
        description: draft.description,
        expenseDate: draft.expenseDate,
        billNo: draft.billNo,
        paymentMode: draft.paymentMode,
        extendedData: { settlement },
      })
      if (pendingBill && created?.id) {
        await lrProcessApi.uploadExpenseAttachment(lrNumber, created.id, pendingBill)
      }
    })
    setDraft({ category: 'Diesel', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), billNo: '', paymentMode: 'Cash' })
    setPendingBill(null)
  }

  const uploadBillForRow = async (expenseId, file) => {
    try {
      await lrProcessApi.uploadExpenseAttachment(lrNumber, expenseId, file)
      toast({ title: 'Bill uploaded', type: 'success' })
      reload?.()
    } catch (err) {
      toast({ title: 'Upload failed', message: err.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Operations" title="Trip Expenses" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader
          title="Trip Expenses"
          breadcrumb={`Home / Trip Expenses / ${lrNumber}`}
          actions={<Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back to list</Button>}
        />

        <div className="grid shrink-0 gap-1 lg:grid-cols-3">
          <OpsSection title="Trip Information" icon={Wallet}>
            <OpsGrid cols={2}>
              <Input label="LR No." value={lrNumber} readOnly />
              <Input label="Vehicle No." value={lr.vehicle || '—'} readOnly />
              <Input label="Driver" value={lr.driver || '—'} readOnly />
              <Input label="Route" value={`${lr.from || '—'} → ${lr.to || '—'}`} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="LR Details">
            <OpsGrid cols={2}>
              <Input label="Customer" value={lr.customerName || lr.consignor || '—'} readOnly />
              <Input label="Freight" readOnly value={formatCurrency(lr.freight)} />
              <Input label="Status" value={lr.status} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Expense Summary">
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between"><dt>Total Expenses</dt><dd className="font-bold">{formatCurrency(totalExpenses)}</dd></div>
              <div className="flex justify-between"><dt>Advance Taken</dt><dd>{formatCurrency(settlement.advanceTaken)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Balance</dt><dd className={balance < 0 ? 'text-red-600' : 'text-green-700'}>{formatCurrency(balance)}</dd></div>
            </dl>
          </OpsSection>
        </div>

        <OpsExpenseSettlement form={settlement} onChange={setSettlement} />

        <OpsSection title="Add Expense" action={<Button size="sm" icon={Plus} onClick={addExpense} disabled={saving}>Add Expense</Button>}>
          <OpsGrid cols={6}>
            <Select label="Expense Type" options={EXPENSE_TYPES} value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
            <Input label="Date" type="date" value={draft.expenseDate} onChange={(e) => setDraft((d) => ({ ...d, expenseDate: e.target.value }))} />
            <Input label="Amount (₹)" type="number" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
            <Input label="Bill No." value={draft.billNo} onChange={(e) => setDraft((d) => ({ ...d, billNo: e.target.value }))} />
            <Input label="Description" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            <div>
              <p className="mb-0.5 text-[10px] font-medium text-slate-600">Bill Upload</p>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed px-2 py-1 text-[10px]">
                <Upload className="h-3 w-3" />
                {pendingBill?.name || 'Attach bill'}
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPendingBill(e.target.files?.[0] || null)} />
              </label>
            </div>
          </OpsGrid>
        </OpsSection>

        <OpsSection title="Expense Details" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="lr-entry-items-scroll">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-primary text-white">
                <tr>
                  {['#', 'Type', 'Date', 'Bill No.', 'Description', 'Amount (₹)', 'Bill', 'Status'].map((h) => (
                    <th key={h} className="px-1 py-1 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={8} className="px-2 py-4 text-center text-slate-500">No expenses yet — add above.</td></tr>
                ) : expenses.map((e, i) => (
                  <tr key={e.id || i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-1 py-0.5">{i + 1}</td>
                    <td className="px-1 py-0.5">{e.category}</td>
                    <td className="px-1 py-0.5">{e.expenseDate || '—'}</td>
                    <td className="px-1 py-0.5">{e.billNo || '—'}</td>
                    <td className="px-1 py-0.5">{e.description || '—'}</td>
                    <td className="px-1 py-0.5">{formatCurrency(e.amount)}</td>
                    <td className="px-1 py-0.5">
                      {e.attachmentUrl ? (
                        <a href={e.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary">View</a>
                      ) : (
                        <label className="cursor-pointer text-primary">
                          Upload
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(ev) => uploadBillForRow(e.id, ev.target.files?.[0])} />
                        </label>
                      )}
                    </td>
                    <td className="px-1 py-0.5">{e.status || 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
              {expenses.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold dark:bg-slate-900">
                  <tr>
                    <td colSpan={5} className="px-1 py-1 text-right">Total</td>
                    <td className="px-1 py-1">{formatCurrency(totalExpenses)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </OpsSection>

        <OpsFooter
          saving={saving}
          onCancel={() => navigate('/lr/list?status=expense-pending')}
          onSave={addExpense}
          onSavePrint={addExpense}
          onClear={() => {
            setDraft({ category: 'Diesel', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), billNo: '', paymentMode: 'Cash' })
            setPendingBill(null)
          }}
        />
      </div>
    </ERPContentPage>
  )
}

export default function TripExpensesEntryPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Trip Expenses"
      stage="invoice-generated"
      processStep="expense"
      basePath="/operations/trip-expenses"
      queueHint="Select an LR with invoice generated to add trip expenses (CRUD)."
    >
      {(ctx) => <TripExpensesForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
