import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import ExpenseAttachmentField from '../../components/expenses/ExpenseAttachmentField'
import VehicleMasterSelect from '../../components/masters/VehicleMasterSelect'
import PartyMasterSelect from '../../components/masters/PartyMasterSelect'
import { expensesApi, vendorsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { PAYMENT_MODES, DEFAULT_PAYMENT_MODE } from '../../constants/paymentModes'
import { DEFAULT_EXPENSE_CATEGORIES, loadExpenseCategories } from '../../constants/expenseCategories'

export default function NewExpense() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [categories, setCategories] = useState(DEFAULT_EXPENSE_CATEGORIES)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Miscellaneous',
    description: '',
    vehicle: '',
    vehicleId: '',
    vendor: '',
    vendorId: '',
    amount: '',
    paymentmode: DEFAULT_PAYMENT_MODE,
  })

  useEffect(() => {
    loadExpenseCategories(expensesApi).then(setCategories)
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const created = await expensesApi.create({
        date: form.date,
        category: form.category,
        description: form.description,
        vehicle: form.vehicle,
        vehicleId: form.vehicleId || undefined,
        vendor: form.vendor,
        vendorId: form.vendorId || undefined,
        amount: Number(form.amount) || 0,
        paymentMode: form.paymentmode,
        status: 'Approved',
      })
      if (created?.id && pendingFiles.length) {
        for (const file of pendingFiles) {
          await expensesApi.uploadAttachment(created.id, file)
        }
      }
      toast({ title: 'Saved', message: 'Expense created.', type: 'success' })
      navigate('/expenses/management')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Expenses" title="Add New Record">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Expense Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} options={categories} />
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="sm:col-span-2" />
          <VehicleMasterSelect
            label="Vehicle"
            displayValue={form.vehicle}
            placeholder="Search vehicle number…"
            onSelect={(row) => setForm((f) => ({ ...f, vehicleId: row?.id ?? '', vehicle: row?.number ?? '' }))}
          />
          <PartyMasterSelect
            label="Vendor"
            api={vendorsApi}
            masterKey="vendors"
            valueId={form.vendorId}
            displayValue={form.vendor}
            placeholder="Search vendor…"
            onSelect={(row) => setForm((f) => ({
              ...f,
              vendorId: row?.id ?? '',
              vendor: row?.name ?? row?.companyName ?? '',
            }))}
          />
          <Select label="Payment Mode" value={form.paymentmode} onChange={(e) => setForm((f) => ({ ...f, paymentmode: e.target.value }))} options={PAYMENT_MODES} />
          <ExpenseAttachmentField pendingFiles={pendingFiles} onPendingChange={setPendingFiles} />
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Expense'}
          </Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/expenses/management')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
