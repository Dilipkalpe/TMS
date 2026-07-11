import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import LookupSelect from '../../components/ui/LookupSelect'
import { bookingFinanceApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useApiResource } from '../../hooks/useApiResource'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { Plus, Loader2 } from 'lucide-react'

export default function ProvisionsPage() {
  const { toast } = useToast()
  const { data: items, loading, error, refresh: reload } = useApiResource(() => bookingFinanceApi.provisions())
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    provisionType: 'Vendor',
    partyName: '',
    partyId: '',
    amount: '',
    referenceNo: '',
    remarks: '',
  })

  const columns = [
    { key: 'provisionDate', label: 'Date' },
    { key: 'provisionType', label: 'Type' },
    { key: 'partyName', label: 'Party / Vendor' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'referenceNo', label: 'Reference' },
    { key: 'isReversed', label: 'Status', render: (r) => (r.isReversed ? 'Reversed' : 'Active') },
  ]

  const handleSave = async () => {
    if (!form.partyName?.trim() || !Number(form.amount)) {
      toast({ title: 'Validation', message: 'Party name and amount are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await bookingFinanceApi.createProvision({ ...form, amount: Number(form.amount) })
      toast({ title: 'Provision saved', type: 'success' })
      setForm({ provisionType: 'Vendor', partyName: '', partyId: '', amount: '', referenceNo: '', remarks: '' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Accounting" title="Vendor & Party Provisions">
      <Card>
        <CardHeader title="Create Provision" subtitle="Vendor provision or Party (customer) provision" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Type" options={['Vendor', 'Party']} value={form.provisionType} onChange={(e) => setForm((f) => ({ ...f, provisionType: e.target.value, partyName: '', partyId: '' }))} />
          {form.provisionType === 'Vendor' ? (
            <LookupSelect label="Vendor" type="vendors" value={form.partyName} onChange={(v) => setForm((f) => ({ ...f, partyName: v }))} placeholder="Search vendor…" />
          ) : (
            <LookupSelect label="Customer / Party" type="customers" value={form.partyName} onChange={(v) => setForm((f) => ({ ...f, partyName: v }))} placeholder="Search customer…" />
          )}
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label="Reference" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
          <div className="sm:col-span-2">
            <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={handleSave}>Save Provision</Button>
      </Card>

      <Card className="mt-4" padding={false}>
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <CardHeader title="Provision Register" />
        </div>
        {error && <p className="px-4 py-2 text-sm text-red-500">{error}</p>}
        {loading ? <p className="px-4 py-4 text-sm text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={items} showActions={false} />
        )}
      </Card>
    </ERPContentPage>
  )
}
