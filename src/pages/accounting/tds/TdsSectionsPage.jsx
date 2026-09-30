import { useCallback, useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { tdsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Plus, Loader2 } from 'lucide-react'

export default function TdsSectionsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    sectionCode: '', name: '', natureOfPayment: '', partyType: 'BOTH',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await tdsApi.sections(false) || [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.sectionCode?.trim()) {
      toast({ title: 'Validation', message: 'Section code is required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await tdsApi.createSection(form)
      toast({ title: 'Section saved', type: 'success' })
      setForm({ sectionCode: '', name: '', natureOfPayment: '', partyType: 'BOTH' })
      await load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row) => {
    try {
      await tdsApi.updateSection(row.id, { isActive: !row.isActive })
      await load()
    } catch (err) {
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    }
  }

  const columns = [
    { key: 'sectionCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'natureOfPayment', label: 'Nature' },
    { key: 'partyType', label: 'Party' },
    {
      key: 'isActive',
      label: 'Active',
      render: (r) => (
        <button type="button" className="text-sm text-primary underline" onClick={() => toggleActive(r)}>
          {r.isActive ? 'Yes' : 'No'}
        </button>
      ),
    },
  ]

  return (
    <ERPContentPage module="Accounting" title="TDS Section Master">
      <Card>
        <CardHeader title="Add Section" subtitle="e.g. 194C, 194J" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Section Code *" value={form.sectionCode} onChange={(e) => setForm((f) => ({ ...f, sectionCode: e.target.value }))} placeholder="194C" />
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Nature of Payment" value={form.natureOfPayment} onChange={(e) => setForm((f) => ({ ...f, natureOfPayment: e.target.value }))} />
          <Select label="Party Type" options={['BOTH', 'VENDOR', 'CUSTOMER']} value={form.partyType} onChange={(e) => setForm((f) => ({ ...f, partyType: e.target.value }))} />
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Add Section'}
        </Button>
      </Card>
      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Sections" />
        {loading ? <p className="px-4 py-4 text-sm text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={rows} showActions={false} selectable={false} />
        )}
      </Card>
    </ERPContentPage>
  )
}
