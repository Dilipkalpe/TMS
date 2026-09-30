import { useCallback, useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { tdsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { Plus, Loader2 } from 'lucide-react'

export default function TdsRatesPage() {
  const { toast } = useToast()
  const [sections, setSections] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    sectionId: '',
    ratePercent: '1',
    rateWithoutPanPercent: '20',
    thresholdAmount: '0',
    thresholdType: 'TRANSACTION',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [secs, rates] = await Promise.all([tdsApi.sections(true), tdsApi.rates()])
      setSections(secs || [])
      setRows(rates || [])
      if (!form.sectionId && secs?.[0]?.id) setForm((f) => ({ ...f, sectionId: secs[0].id }))
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.sectionId) {
      toast({ title: 'Validation', message: 'Select a section.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await tdsApi.createRate({
        ...form,
        ratePercent: Number(form.ratePercent),
        rateWithoutPanPercent: Number(form.rateWithoutPanPercent),
        thresholdAmount: Number(form.thresholdAmount) || 0,
      })
      toast({ title: 'Rate saved', type: 'success' })
      await load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'sectionCode', label: 'Section' },
    { key: 'ratePercent', label: 'Rate %' },
    { key: 'rateWithoutPanPercent', label: 'Without PAN %' },
    { key: 'thresholdAmount', label: 'Threshold', render: (r) => formatCurrency(r.thresholdAmount) },
    { key: 'thresholdType', label: 'Type' },
    { key: 'effectiveFrom', label: 'From' },
    { key: 'effectiveTo', label: 'To' },
    { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
  ]

  return (
    <ERPContentPage module="Accounting" title="TDS Rate Master">
      <Card>
        <CardHeader title="Add Rate" subtitle="Rates are date-effective and editable" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Section *"
            options={sections.map((s) => ({ value: s.id, label: `${s.sectionCode} — ${s.name}` }))}
            value={form.sectionId}
            onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
          />
          <Input label="Rate %" type="number" value={form.ratePercent} onChange={(e) => setForm((f) => ({ ...f, ratePercent: e.target.value }))} />
          <Input label="Rate without PAN %" type="number" value={form.rateWithoutPanPercent} onChange={(e) => setForm((f) => ({ ...f, rateWithoutPanPercent: e.target.value }))} />
          <Input label="Threshold Amount" type="number" value={form.thresholdAmount} onChange={(e) => setForm((f) => ({ ...f, thresholdAmount: e.target.value }))} />
          <Select label="Threshold Type" options={['TRANSACTION', 'ANNUAL']} value={form.thresholdType} onChange={(e) => setForm((f) => ({ ...f, thresholdType: e.target.value }))} />
          <Input label="Effective From" type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Add Rate'}
        </Button>
      </Card>
      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Rates" />
        {loading ? <p className="px-4 py-4 text-sm text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={rows} showActions={false} selectable={false} exportFilename="tds-rates" />
        )}
      </Card>
    </ERPContentPage>
  )
}
