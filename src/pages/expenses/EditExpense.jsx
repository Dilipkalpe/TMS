import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

export default function EditExpense() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [categories, setCategories] = useState(DEFAULT_EXPENSE_CATEGORIES)
  const [form, setForm] = useState({
    date: '',
    category: 'Miscellaneous',
    description: '',
    vehicle: '',
    vehicleId: '',
    vendor: '',
    vendorId: '',
    amount: '',
    paymentmode: DEFAULT_PAYMENT_MODE,
    status: 'Approved',
  })

  const load = async () => {
    setLoading(true)
    try {
      const e = await expensesApi.get(id)
      setForm({
        date: e.date || '',
        category: e.category || 'Miscellaneous',
        description: e.description || '',
        vehicle: e.vehicle || '',
        vehicleId: e.vehicleId || '',
        vendor: e.vendor || '',
        vendorId: e.vendorId || '',
        amount: e.amount != null ? String(e.amount) : '',
        paymentmode: e.paymentMode || DEFAULT_PAYMENT_MODE,
        status: e.status || 'Approved',
      })
      setAttachments(e.attachments || (await expensesApi.listAttachments(id)) || [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
      navigate('/expenses/management')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenseCategories(expensesApi).then(setCategories)
    load()
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      await expensesApi.update(id, {
        date: form.date,
        category: form.category,
        description: form.description,
        vehicle: form.vehicle,
        vehicleId: form.vehicleId || undefined,
        vendor: form.vendor,
        vendorId: form.vendorId || undefined,
        amount: Number(form.amount) || 0,
        paymentMode: form.paymentmode,
        status: form.status,
      })
      if (pendingFiles.length) {
        setUploading(true)
        for (const file of pendingFiles) {
          await expensesApi.uploadAttachment(id, file)
        }
        setPendingFiles([])
        setUploading(false)
      }
      const refreshed = await expensesApi.listAttachments(id)
      setAttachments(refreshed || [])
      toast({ title: 'Saved', message: 'Expense updated successfully.', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const viewAttachment = async (a) => {
    try {
      await expensesApi.openAttachment(id, a.id, a.fileName)
    } catch (err) {
      toast({ title: 'View failed', message: err.message, type: 'error' })
    }
  }

  const removeAttachment = async (a) => {
    if (!window.confirm(`Remove ${a.fileName}?`)) return
    try {
      await expensesApi.removeAttachment(id, a.id)
      setAttachments((prev) => prev.filter((x) => x.id !== a.id))
      toast({ title: 'Removed', type: 'success' })
    } catch (err) {
      toast({ title: 'Remove failed', message: err.message, type: 'error' })
    }
  }

  if (loading) {
    return (
      <ERPContentPage module="Expenses" title="Edit Expense">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="Expenses" title={`Edit Expense — ${id}`}>
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
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={['Approved', 'Pending', 'Rejected']} />

          <ExpenseAttachmentField
            pendingFiles={pendingFiles}
            onPendingChange={setPendingFiles}
            savedAttachments={attachments}
            onView={viewAttachment}
            onRemoveSaved={removeAttachment}
            disabled={saving}
            uploading={uploading}
          />
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={saving || uploading ? Loader2 : Save} onClick={save} disabled={saving || uploading}>
            {saving || uploading ? 'Saving…' : 'Save Expense'}
          </Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/expenses/management')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
