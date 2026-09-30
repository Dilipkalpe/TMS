import { useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import PartyMasterSelect from '../../../components/masters/PartyMasterSelect'
import { customersApi, glApi, vendorsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Save, Loader2 } from 'lucide-react'

export default function GlCreditDebitNotesPage() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    noteType: 'CREDIT',
    partyType: 'CUSTOMER',
    partyId: '',
    partyName: '',
    noteDate: new Date().toISOString().slice(0, 10),
    taxableAmount: '',
    taxAmount: '',
    narration: '',
  })

  const handleSave = async () => {
    if (!form.partyId || !Number(form.taxableAmount)) {
      toast({ title: 'Validation', message: 'Party and taxable amount required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await glApi.createNote({
        ...form,
        taxableAmount: Number(form.taxableAmount),
        taxAmount: Number(form.taxAmount) || 0,
      })
      toast({ title: 'Note posted', message: `${res.noteNo}`, type: 'success' })
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally { setSaving(false) }
  }

  const isVendor = form.partyType === 'VENDOR'

  return (
    <ERPContentPage module="Accounting" title="Credit / Debit Notes">
      <Card>
        <CardHeader title="Create Note" subtitle="Posts reversing / adjusting GL voucher" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Note Type" options={['CREDIT', 'DEBIT']} value={form.noteType} onChange={(e) => setForm((f) => ({ ...f, noteType: e.target.value }))} />
          <Select
            label="Party Type"
            options={['CUSTOMER', 'VENDOR']}
            value={form.partyType}
            onChange={(e) => setForm((f) => ({ ...f, partyType: e.target.value, partyId: '', partyName: '' }))}
          />
          <PartyMasterSelect
            label={isVendor ? 'Vendor *' : 'Customer *'}
            api={isVendor ? vendorsApi : customersApi}
            masterKey={isVendor ? 'vendors' : 'customers'}
            valueId={form.partyId}
            displayValue={form.partyName}
            placeholder={isVendor ? 'Search vendor…' : 'Search customer…'}
            onSelect={(row) => setForm((f) => ({
              ...f,
              partyId: row?.id ?? '',
              partyName: row?.name ?? row?.companyName ?? '',
            }))}
          />
          <Input label="Date" type="date" value={form.noteDate} onChange={(e) => setForm((f) => ({ ...f, noteDate: e.target.value }))} />
          <Input label="Taxable *" type="number" value={form.taxableAmount} onChange={(e) => setForm((f) => ({ ...f, taxableAmount: e.target.value }))} />
          <Input label="Tax" type="number" value={form.taxAmount} onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))} />
          <div className="sm:col-span-2"><Input label="Narration" value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} /></div>
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>
          {saving ? 'Posting…' : 'Post Note'}
        </Button>
      </Card>
    </ERPContentPage>
  )
}
