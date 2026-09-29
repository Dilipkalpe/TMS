import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import ExpenseAttachmentField from '../../components/expenses/ExpenseAttachmentField'
import { expensesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const CATEGORIES = ['Fuel', 'Toll', 'Maintenance', 'Salary', 'Office Expense', 'Miscellaneous']
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'FASTag', 'UPI']

export default function EditExpense() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [form, setForm] = useState({
    date: '',
    category: 'Miscellaneous',
    description: '',
    vehicle: '',
    vendor: '',
    amount: '',
    paymentmode: 'Cash',
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
        vendor: e.vendor || '',
        amount: e.amount != null ? String(e.amount) : '',
        paymentmode: e.paymentMode || 'Cash',
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

  useEffect(() => { load() }, [id])

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const save = async () => {
    setSaving(true)
    try {
      await expensesApi.update(id, {
        date: form.date,
        category: form.category,
        description: form.description,
        vehicle: form.vehicle,
        vendor: form.vendor,
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
          <Input label="Expense Date" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
          <Select label="Category" value={form.category} onChange={(e) => setField('category', e.target.value)} options={CATEGORIES} />
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
          <Input label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} className="sm:col-span-2" />
          <Input label="Vehicle" value={form.vehicle} onChange={(e) => setField('vehicle', e.target.value)} />
          <Input label="Vendor" value={form.vendor} onChange={(e) => setField('vendor', e.target.value)} />
          <Select label="Payment Mode" value={form.paymentmode} onChange={(e) => setField('paymentmode', e.target.value)} options={PAYMENT_MODES} />
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)} options={['Approved', 'Pending', 'Rejected']} />

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
