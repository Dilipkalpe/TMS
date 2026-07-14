import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import LookupSelect from '../../components/ui/LookupSelect'
import DriverLookupSelect from '../../components/ui/DriverLookupSelect'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { lrApi, bookingsApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Save, Printer, Download, Copy, Loader2 } from 'lucide-react'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'
import { useDocumentFlow } from '../../hooks/useDocumentFlow'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']

function mapLrRows(result) {
  const rows = Array.isArray(result) ? result : (result?.items ?? [])
  return rows.map((r) => ({
    lrNumber: r.lrNumber,
    lrDate: r.lrDate,
    consignor: r.consignor,
    consignee: r.consignee,
    from: r.from,
    to: r.to,
    freight: r.freight,
    balance: r.balance,
  }))
}

const emptyForm = () => ({
  bookingId: '',
  lrNumber: '',
  lrDate: new Date().toISOString().slice(0, 10),
  consignor: '',
  consignee: '',
  from: '',
  to: '',
  vehicle: '',
  driver: '',
  material: '',
  quantity: '',
  freight: 0,
  gst: 0,
  hamali: 0,
  loadingCharges: 0,
  unloadingCharges: 0,
  insurance: 0,
  advance: 0,
  balance: 0,
  paymentType: 'To Pay',
  remarks: '',
})

export default function GenerateLR() {
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [searchParams] = useSearchParams()
  const { isFirstBookingThenLr, documentFlowLabel, loading: flowLoading } = useDocumentFlow()
  const [form, setForm] = useState(emptyForm)
  const [lrList, setLrList] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookingOptions, setBookingOptions] = useState([{ value: '', label: 'Select booking…' }])

  useEffect(() => {
    lrApi.list({ page: 1, pageSize: 15 })
      .then((lrs) => setLrList(mapLrRows(lrs)))
      .catch(() => toast({ title: 'Load failed', message: 'Could not load LR data.', type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    if (!isFirstBookingThenLr) return
    bookingsApi.list({ page: 1, pageSize: 100 })
      .then((res) => {
        const rows = unwrapList(res)
        setBookingOptions([
          { value: '', label: 'Select booking…' },
          ...rows.map((b) => ({
            value: b.id,
            label: `${b.id} · ${b.customer || b.customerName || ''} · ${b.from || ''} → ${b.to || ''}`,
          })),
        ])
      })
      .catch(() => setBookingOptions([{ value: '', label: 'Select booking…' }]))
  }, [isFirstBookingThenLr])
  useEffect(() => {
    const bookingId = searchParams.get('bookingId')
    if (!bookingId) return
    lrApi.prefillFromBooking(bookingId)
      .then((prefill) => {
        setForm((prev) => ({
          ...prev,
          bookingId: prefill.bookingId,
          consignor: prefill.consignor ?? '',
          consignee: prefill.consignee ?? '',
          from: prefill.from ?? '',
          to: prefill.to ?? '',
          vehicle: prefill.vehicle ?? '',
          driver: prefill.driver ?? '',
          material: prefill.material ?? '',
          quantity: prefill.quantity ?? '',
          freight: prefill.freight ?? 0,
          gst: prefill.gst ?? 0,
          hamali: prefill.hamali ?? 0,
          loadingCharges: prefill.loadingCharges ?? 0,
          unloadingCharges: prefill.unloadingCharges ?? 0,
          insurance: prefill.insurance ?? 0,
          advance: prefill.advance ?? 0,
          balance: prefill.balance ?? 0,
          paymentType: prefill.paymentType ?? prev.paymentType,
          remarks: prefill.remarks ?? '',
        }))
      })
      .catch((err) => toast({ title: 'Booking load failed', message: err.message, type: 'warning' }))
  }, [searchParams, toast])

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      const total = Number(next.freight) + Number(next.gst) + Number(next.hamali) + Number(next.loadingCharges) + Number(next.unloadingCharges) + Number(next.insurance)
      next.balance = total - Number(next.advance)
      return next
    })
  }

  const handleSave = async () => {
    if (isFirstBookingThenLr && !form.bookingId?.trim()) {
      toast({
        title: 'Validation',
        message: `Company Document Flow is "${documentFlowLabel}". Create a Booking first, then link it when generating the LR.`,
        type: 'warning',
      })
      return
    }
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'From and To cities are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const created = await lrApi.create(form)
      toast({ title: 'LR saved', message: `${created.lrNumber} created successfully.`, type: 'success' })
      setForm(emptyForm())
      const lrs = await lrApi.list({ page: 1, pageSize: 15 })
      setLrList(mapLrRows(lrs))
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    print(<LRPrintFormat lr={form} company={company} />)
  }

  const handleDelete = async (row) => {
    if (!row?.lrNumber) {
      toast({ title: 'Delete failed', message: 'LR number is missing.', type: 'error' })
      return
    }
    if (!window.confirm(`Delete LR ${row.lrNumber}?`)) return
    try {
      await lrApi.remove(row.lrNumber)
      setLrList((prev) => prev.filter((r) => r.lrNumber !== row.lrNumber))
      toast({ title: 'Deleted', message: `LR ${row.lrNumber} removed.`, type: 'success' })
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  const handlePrintLr = async (row) => {
    try {
      const lr = await lrApi.get(row.lrNumber)
      print(<LRPrintFormat lr={lr} company={company} />)
    } catch (err) {
      toast({ title: 'Print failed', message: err.message, type: 'error' })
    }
  }

  const lrColumns = [
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'Date' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
  ]

  if (loading) {
    return (
      <ERPContentPage module="LR Management" title="Add New Record">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="LR" title="Add New Record">
      {isFirstBookingThenLr && !flowLoading && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Document Flow: <strong>{documentFlowLabel}</strong>. Booking No. is required before saving this LR.
        </div>
      )}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Generate New LR" subtitle="Fill in the LR details below" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="LR Number" value={form.lrNumber} placeholder="Auto-generated on save" onChange={(e) => update('lrNumber', e.target.value)} />
            {isFirstBookingThenLr ? (
              <Select
                label="Booking No. (required)"
                value={form.bookingId}
                options={bookingOptions}
                onChange={(e) => {
                  const bookingId = e.target.value
                  update('bookingId', bookingId)
                  if (bookingId) {
                    lrApi.prefillFromBooking(bookingId)
                      .then((prefill) => {
                        setForm((prev) => ({
                          ...prev,
                          bookingId: prefill.bookingId,
                          consignor: prefill.consignor ?? '',
                          consignee: prefill.consignee ?? '',
                          from: prefill.from ?? '',
                          to: prefill.to ?? '',
                          vehicle: prefill.vehicle ?? '',
                          driver: prefill.driver ?? '',
                          material: prefill.material ?? '',
                          quantity: prefill.quantity ?? '',
                          freight: prefill.freight ?? 0,
                          gst: prefill.gst ?? 0,
                          hamali: prefill.hamali ?? 0,
                          loadingCharges: prefill.loadingCharges ?? 0,
                          unloadingCharges: prefill.unloadingCharges ?? 0,
                          insurance: prefill.insurance ?? 0,
                          advance: prefill.advance ?? 0,
                          balance: prefill.balance ?? 0,
                          paymentType: prefill.paymentType ?? prev.paymentType,
                          remarks: prefill.remarks ?? '',
                        }))
                      })
                      .catch((err) => toast({ title: 'Booking load failed', message: err.message, type: 'warning' }))
                  }
                }}
              />
            ) : (
              <Input label="Booking No." value={form.bookingId} placeholder="Optional link" onChange={(e) => update('bookingId', e.target.value)} />
            )}
            <Input label="LR Date" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
            <Input label="Consignor" value={form.consignor} onChange={(e) => update('consignor', e.target.value)} />
            <Input label="Consignee" value={form.consignee} onChange={(e) => update('consignee', e.target.value)} />
            <Input label="From" value={form.from} onChange={(e) => update('from', e.target.value)} />
            <Input label="To" value={form.to} onChange={(e) => update('to', e.target.value)} />
            <LookupSelect label="Vehicle" type="vehicles" value={form.vehicle} onChange={(v) => update('vehicle', v)} placeholder="Search vehicle…" />
            <DriverLookupSelect label="Driver" value={form.driver} onChange={(v) => update('driver', v)} />
            <Input label="Material" value={form.material} onChange={(e) => update('material', e.target.value)} />
            <Input label="Quantity" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
            <Input label="Freight (₹)" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
            <Input label="GST (₹)" type="number" value={form.gst} onChange={(e) => update('gst', e.target.value)} />
            <Input label="Hamali (₹)" type="number" value={form.hamali} onChange={(e) => update('hamali', e.target.value)} />
            <Input label="Loading Charges (₹)" type="number" value={form.loadingCharges} onChange={(e) => update('loadingCharges', e.target.value)} />
            <Input label="Unloading Charges (₹)" type="number" value={form.unloadingCharges} onChange={(e) => update('unloadingCharges', e.target.value)} />
            <Input label="Insurance (₹)" type="number" value={form.insurance} onChange={(e) => update('insurance', e.target.value)} />
            <Input label="Advance (₹)" type="number" value={form.advance} onChange={(e) => update('advance', e.target.value)} />
            <Input label="Balance (₹)" type="number" value={form.balance} readOnly />
            <Select label="Payment Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
            <div className="sm:col-span-2 lg:col-span-3">
              <Textarea label="Remarks" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="outline" icon={Printer} onClick={handlePrint}>Print LR</Button>
            <Button variant="outline" icon={Download} disabled title="Use Print → Save as PDF">Download PDF</Button>
            <Button variant="outline" icon={Copy} onClick={() => setForm((f) => ({ ...f, lrNumber: '' }))}>Duplicate LR</Button>
          </div>
        </Card>
        <Card padding={false}>
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800 sm:px-4">
            <CardHeader title="Recent LR List" />
          </div>
          <ERPDataTable
            columns={lrColumns}
            data={lrList}
            onDelete={handleDelete}
            onPrint={handlePrintLr}
            rowPrintTitle="Print LR"
          />
        </Card>
      </div>
    </ERPContentPage>
  )
}
