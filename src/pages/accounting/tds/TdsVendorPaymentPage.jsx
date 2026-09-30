import { useCallback, useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import LookupSelect from '../../../components/ui/LookupSelect'
import { tdsApi, vendorsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { Save, Loader2, Calculator } from 'lucide-react'
import { PAYMENT_MODES } from '../../../constants/paymentModes'

export default function TdsVendorPaymentPage() {
  const { toast } = useToast()
  const [sections, setSections] = useState([])
  const [history, setHistory] = useState([])
  const [vendorName, setVendorName] = useState('')
  const [vendor, setVendor] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vendorId: '',
    grossAmount: '',
    sectionId: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    narration: '',
  })

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await tdsApi.vendorPayments() || [])
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    tdsApi.sections(true).then((s) => setSections(s || [])).catch(() => {})
    loadHistory()
  }, [loadHistory])

  const resolveVendor = async (name) => {
    setVendorName(name)
    if (!name?.trim()) {
      setVendor(null)
      setForm((f) => ({ ...f, vendorId: '', sectionId: '' }))
      return
    }
    try {
      const res = await vendorsApi.list({ search: name, pageSize: 10 })
      const items = res?.items || res || []
      const match = items.find((v) => v.name?.toLowerCase() === name.toLowerCase()) || items[0]
      if (match) {
        setVendor(match)
        setForm((f) => ({
          ...f,
          vendorId: match.id,
          sectionId: match.defaultTdsSectionId || f.sectionId,
        }))
      }
    } catch {
      setVendor(null)
    }
  }

  const runPreview = async () => {
    const gross = Number(form.grossAmount)
    if (!form.vendorId || !gross || gross <= 0) {
      toast({ title: 'Validation', message: 'Select vendor and enter gross amount.', type: 'warning' })
      return
    }
    try {
      const result = await tdsApi.calculate({
        partyType: 'VENDOR',
        partyId: form.vendorId,
        pan: vendor?.pan,
        sectionId: form.sectionId || undefined,
        baseAmount: gross,
        date: form.paymentDate,
      })
      setPreview(result)
      if (result.warning) toast({ title: 'TDS note', message: result.warning, type: 'warning' })
    } catch (err) {
      toast({ title: 'Calculate failed', message: err.message, type: 'error' })
    }
  }

  const handleSave = async () => {
    const gross = Number(form.grossAmount)
    if (!form.vendorId || !gross || gross <= 0) {
      toast({ title: 'Validation', message: 'Select vendor and enter gross amount.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await tdsApi.createVendorPayment({
        vendorId: form.vendorId,
        grossAmount: gross,
        sectionId: form.sectionId || undefined,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo || undefined,
        narration: form.narration || undefined,
      })
      toast({
        title: 'Vendor payment posted',
        message: `${res.paymentNo || ''} · Net ${formatCurrency(res.netAmount)} · TDS ${formatCurrency(res.tdsAmount)}`,
        type: 'success',
      })
      setForm((f) => ({ ...f, grossAmount: '', referenceNo: '', narration: '' }))
      setPreview(null)
      await loadHistory()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'paymentNo', label: 'Payment No' },
    { key: 'paymentDate', label: 'Date' },
    { key: 'vendorId', label: 'Vendor' },
    { key: 'grossAmount', label: 'Gross', render: (r) => formatCurrency(r.grossAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
    { key: 'netAmount', label: 'Net', render: (r) => formatCurrency(r.netAmount) },
    { key: 'paymentMode', label: 'Mode' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <ERPContentPage module="Accounting" title="Vendor Payment (TDS Payable)">
      <Card>
        <CardHeader title="Record Vendor Payment" subtitle="Deduct TDS payable and post payment voucher" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LookupSelect label="Vendor *" type="vendors" value={vendorName} onChange={resolveVendor} />
          <Input label="Gross Amount (₹) *" type="number" value={form.grossAmount} onChange={(e) => setForm((f) => ({ ...f, grossAmount: e.target.value }))} />
          <Select
            label="TDS Section"
            options={[{ value: '', label: '— None / no TDS —' }, ...sections.map((s) => ({ value: s.id, label: `${s.sectionCode} — ${s.name}` }))]}
            value={form.sectionId}
            onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
          />
          <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} />
          <Select label="Mode" options={PAYMENT_MODES} value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))} />
          <Input label="Reference" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input label="Narration" value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} />
          </div>
        </div>
        {vendor && !vendor.pan && (
          <p className="mt-2 text-sm text-amber-600">Vendor has no PAN — without-PAN rate may apply.</p>
        )}
        {preview && (
          <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-4">
            <div><p className="text-xs text-slate-500">Rate %</p><p className="font-semibold">{preview.appliedRatePercent}</p></div>
            <div><p className="text-xs text-slate-500">TDS</p><p className="font-semibold">{formatCurrency(preview.tdsAmount)}</p></div>
            <div><p className="text-xs text-slate-500">Net Payable</p><p className="font-semibold">{formatCurrency(preview.netAmount)}</p></div>
            <div><p className="text-xs text-slate-500">Flags</p><p className="font-semibold">{preview.usedWithoutPanRate ? 'No PAN rate' : preview.usedExemption ? 'Exemption' : preview.belowThreshold ? 'Below threshold' : '—'}</p></div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" icon={Calculator} onClick={runPreview}>Preview TDS</Button>
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>
            {saving ? 'Posting…' : 'Post Payment'}
          </Button>
        </div>
      </Card>
      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Recent Vendor Payments" />
        <ERPDataTable columns={columns} data={history} showActions={false} selectable={false} exportFilename="vendor-payments" />
      </Card>
    </ERPContentPage>
  )
}
