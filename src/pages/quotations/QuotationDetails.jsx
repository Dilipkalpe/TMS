import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { bookingPath } from '../../utils/docPath'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input, { Select, Textarea } from '../../components/ui/Input'
import { ArrowLeft, Check, FilePlus, Loader2, Save, Send, Trash2, X } from 'lucide-react'
import { freightRatesApi, quotationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../components/ui/ReportFilters'

export default function QuotationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [quote, setQuote] = useState(null)
  const [form, setForm] = useState(null)

  const reload = () => {
    setLoading(true)
    quotationsApi.get(id)
      .then((res) => {
        const q = res.quotation || res
        setQuote(q)
        setForm({
          customerName: q.customerName || '',
          customerId: q.customerId || '',
          fromCity: q.fromCity || '',
          toCity: q.toCity || '',
          vehicleType: q.vehicleType || '',
          freight: q.freight ?? '',
          validUntil: q.validUntil || '',
          notes: q.notes || '',
        })
      })
      .catch((err) => toast({ title: 'Load failed', message: err.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  const run = async (action, success) => {
    setBusy(true)
    try {
      const res = await action()
      toast({ title: success, type: 'success' })
      if (res?.booking?.id) {
        navigate(bookingPath(res.booking.id))
        return
      }
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const applyRate = async () => {
    try {
      const res = await freightRatesApi.lookup({
        from: form.fromCity,
        to: form.toCity,
        customerId: form.customerId || '',
        vehicleType: form.vehicleType || '',
      })
      if (!res?.found) {
        toast({ title: 'No rate found', type: 'warning' })
        return
      }
      setForm((f) => ({ ...f, freight: String(res.rate.rateAmount) }))
      toast({ title: 'Rate applied', message: formatCurrency(res.rate.rateAmount), type: 'success' })
    } catch (err) {
      toast({ title: 'Lookup failed', message: err.message, type: 'error' })
    }
  }

  const save = () => run(
    () => quotationsApi.update(id, { ...form, freight: Number(form.freight) || 0 }),
    'Quotation updated',
  )

  if (loading || !form || !quote) {
    return (
      <ERPContentPage module="Quotations" title="Quotation">
        <div className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </ERPContentPage>
    )
  }

  const editable = quote.status === 'Draft' || quote.status === 'Sent'

  return (
    <ERPContentPage
      module="Quotations"
      title={quote.quoteNo}
      toolbar={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/quotations')}>Back</Button>
          {editable && <Button variant="outline" onClick={applyRate}>Apply Rate</Button>}
          {editable && <Button icon={busy ? Loader2 : Save} disabled={busy} onClick={save}>Save</Button>}
          {(quote.status === 'Draft' || quote.status === 'Sent') && (
            <Button variant="outline" icon={Send} disabled={busy} onClick={() => run(() => quotationsApi.send(id), 'Sent')}>Send</Button>
          )}
          {(quote.status === 'Draft' || quote.status === 'Sent') && (
            <Button icon={Check} disabled={busy} onClick={() => run(() => quotationsApi.accept(id), 'Accepted')}>Accept</Button>
          )}
          {(quote.status === 'Draft' || quote.status === 'Sent') && (
            <Button variant="outline" icon={X} disabled={busy} onClick={() => run(() => quotationsApi.reject(id), 'Rejected')}>Reject</Button>
          )}
          {quote.status === 'Accepted' && !quote.bookingId && (
            <Button icon={FilePlus} disabled={busy} onClick={() => run(() => quotationsApi.convertToBooking(id), 'Converted to booking')}>
              Convert to Booking
            </Button>
          )}
          {quote.bookingId && (
            <Button variant="outline" onClick={() => navigate(bookingPath(quote.bookingId))}>Open Booking</Button>
          )}
          {!quote.bookingId && (
            <Button
              variant="outline"
              icon={Trash2}
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`Delete quotation ${quote.quoteNo}?`)) return
                setBusy(true)
                quotationsApi.remove(id)
                  .then(() => {
                    toast({ title: 'Deleted', type: 'success' })
                    navigate('/quotations')
                  })
                  .catch((err) => toast({ title: 'Delete failed', message: err.message, type: 'error' }))
                  .finally(() => setBusy(false))
              }}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-3"><Badge>{quote.status}</Badge></div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Input label="Customer Name" value={form.customerName} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
        <Input label="Customer Id" value={form.customerId} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} />
        <Input label="From" value={form.fromCity} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, fromCity: e.target.value }))} />
        <Input label="To" value={form.toCity} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, toCity: e.target.value }))} />
        <Select label="Vehicle Type" value={form.vehicleType} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
          options={[
            { value: '', label: 'Any' },
            { value: '32 FT Container', label: '32 FT Container' },
            { value: '20 FT Container', label: '20 FT Container' },
            { value: 'Trailer', label: 'Trailer' },
            { value: '16 FT Truck', label: '16 FT Truck' },
          ]} />
        <Input label="Freight (₹)" type="number" value={form.freight} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, freight: e.target.value }))} />
        <Input label="Valid Until" type="date" value={form.validUntil} disabled={!editable}
          onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
        <div className="sm:col-span-2">
          <Textarea label="Notes" value={form.notes} disabled={!editable}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </Card>
    </ERPContentPage>
  )
}
