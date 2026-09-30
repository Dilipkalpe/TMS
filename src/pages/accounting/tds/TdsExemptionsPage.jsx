import { useCallback, useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import LookupSelect from '../../../components/ui/LookupSelect'
import { tdsApi, vendorsApi, customersApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Plus, Loader2 } from 'lucide-react'

export default function TdsExemptionsPage() {
  const { toast } = useToast()
  const [sections, setSections] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [form, setForm] = useState({
    partyType: 'VENDOR',
    partyId: '',
    sectionId: '',
    certificateNo: '',
    lowerRatePercent: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
    remarks: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [secs, ex] = await Promise.all([tdsApi.sections(true), tdsApi.exemptions()])
      setSections(secs || [])
      setRows(ex || [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const resolvePartyId = async (name) => {
    if (!name?.trim()) return ''
    try {
      if (form.partyType === 'VENDOR') {
        const res = await vendorsApi.list({ search: name, pageSize: 5 })
        const items = res?.items || res || []
        const match = items.find((v) => v.name?.toLowerCase() === name.toLowerCase()) || items[0]
        return match?.id || ''
      }
      const res = await customersApi.list({ search: name, pageSize: 5 })
      const items = res?.items || res || []
      const match = items.find((c) => c.name?.toLowerCase() === name.toLowerCase()) || items[0]
      return match?.id || ''
    } catch {
      return ''
    }
  }

  const handleSave = async () => {
    const partyId = form.partyId || await resolvePartyId(partyName)
    if (!partyId) {
      toast({ title: 'Validation', message: 'Select a party.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await tdsApi.createExemption({
        ...form,
        partyId,
        sectionId: form.sectionId || undefined,
        lowerRatePercent: form.lowerRatePercent === '' ? null : Number(form.lowerRatePercent),
        validTo: form.validTo || undefined,
      })
      toast({ title: 'Exemption saved', type: 'success' })
      setPartyName('')
      setForm((f) => ({ ...f, partyId: '', certificateNo: '', lowerRatePercent: '', remarks: '' }))
      await load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'partyType', label: 'Type' },
    { key: 'partyId', label: 'Party Id' },
    { key: 'sectionCode', label: 'Section' },
    { key: 'certificateNo', label: 'Certificate' },
    { key: 'lowerRatePercent', label: 'Lower %', render: (r) => (r.lowerRatePercent == null ? 'Full exempt' : r.lowerRatePercent) },
    { key: 'validFrom', label: 'From' },
    { key: 'validTo', label: 'To' },
    { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
  ]

  return (
    <ERPContentPage module="Accounting" title="TDS Exemptions">
      <Card>
        <CardHeader title="Add Exemption / Lower Rate Certificate" subtitle="Blank lower rate = full exemption" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Party Type"
            options={['VENDOR', 'CUSTOMER']}
            value={form.partyType}
            onChange={(e) => {
              setForm((f) => ({ ...f, partyType: e.target.value, partyId: '' }))
              setPartyName('')
            }}
          />
          <LookupSelect
            label={form.partyType === 'VENDOR' ? 'Vendor' : 'Customer'}
            type={form.partyType === 'VENDOR' ? 'vendors' : 'customers'}
            value={partyName}
            onChange={async (v) => {
              setPartyName(v)
              const id = await resolvePartyId(v)
              setForm((f) => ({ ...f, partyId: id }))
            }}
          />
          <Select
            label="Section (optional)"
            options={[{ value: '', label: 'All sections' }, ...sections.map((s) => ({ value: s.id, label: s.sectionCode }))]}
            value={form.sectionId}
            onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
          />
          <Input label="Certificate No." value={form.certificateNo} onChange={(e) => setForm((f) => ({ ...f, certificateNo: e.target.value }))} />
          <Input label="Lower Rate % (blank = full exempt)" type="number" value={form.lowerRatePercent} onChange={(e) => setForm((f) => ({ ...f, lowerRatePercent: e.target.value }))} />
          <Input label="Valid From" type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
          <Input label="Valid To" type="date" value={form.validTo} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} />
          <Input label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Add Exemption'}
        </Button>
      </Card>
      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Exemptions" />
        {loading ? <p className="px-4 py-4 text-sm text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={rows} showActions={false} selectable={false} />
        )}
      </Card>
    </ERPContentPage>
  )
}
