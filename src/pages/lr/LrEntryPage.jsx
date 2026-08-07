import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select } from '../../components/ui/Input'
import LrEntryFormLayout, { buildLrApiPayload, emptyLrEntryForm } from '../../components/lr/LrEntryFormLayout'
import { lrApi, bookingsApi, unwrapList } from '../../services/api'
import { useDocumentFlow } from '../../hooks/useDocumentFlow'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'
import { lrProcessPath } from '../../utils/docPath'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'

export default function LrEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [searchParams] = useSearchParams()
  const { isFirstBookingThenLr, documentFlowLabel, loading: flowLoading } = useDocumentFlow()
  const [form, setForm] = useState(emptyLrEntryForm)
  const [saving, setSaving] = useState(false)
  const [bookingOptions, setBookingOptions] = useState([{ value: '', label: 'Select booking…' }])

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
      .catch(() => {})
  }, [isFirstBookingThenLr])

  useEffect(() => {
    const bookingId = searchParams.get('bookingId')
    if (!bookingId) return
    lrApi.prefillFromBooking(bookingId)
      .then((prefill) => setForm((prev) => ({ ...prev, ...prefill, bookingId: prefill.bookingId })))
      .catch((err) => toast({ title: 'Booking load failed', message: err.message, type: 'warning' }))
  }, [searchParams, toast])

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      const total = Number(next.freight) + Number(next.gst) + Number(next.hamali)
        + Number(next.loadingCharges) + Number(next.unloadingCharges) + Number(next.insurance)
        + Number(next.otherCharges || 0)
      next.balance = total - Number(next.advance)
      return next
    })
  }

  const validate = () => {
    if (isFirstBookingThenLr && !form.bookingId?.trim()) {
      toast({ title: 'Validation', message: `Document Flow "${documentFlowLabel}" requires a Booking first.`, type: 'warning' })
      return false
    }
    if (!form.consignorId && !form.consignor?.trim()) {
      toast({ title: 'Validation', message: 'Consignor is required.', type: 'warning' })
      return false
    }
    if (!form.consigneeId && !form.consignee?.trim()) {
      toast({ title: 'Validation', message: 'Consignee is required.', type: 'warning' })
      return false
    }
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'From and To are required.', type: 'warning' })
      return false
    }
    return true
  }

  const handleSave = async (andPrint = false) => {
    if (!validate()) return
    setSaving(true)
    try {
      const created = await lrApi.create(buildLrApiPayload(form))
      toast({ title: 'LR saved', message: `${created.lrNumber} created.`, type: 'success' })
      if (andPrint) {
        const lr = await lrApi.get(created.lrNumber)
        print(<LRPrintFormat lr={lr} company={company} />)
      }
      navigate(lrProcessPath(created.lrNumber))
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const formRef = useRef(null)

  useAutoFocus(formRef)

  useKeyboardPageActions({
    onSave: () => handleSave(false),
    onPrint: () => handleSave(true),
    onPreview: () => print(<LRPrintFormat lr={buildLrApiPayload(form)} company={company} />),
    onCancel: () => navigate('/lr/list'),
    onNew: () => setForm(emptyLrEntryForm()),
  }, [form, saving])

  const flowBanner = isFirstBookingThenLr && !flowLoading ? (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40">
      Document Flow: <strong>{documentFlowLabel}</strong> — link a Booking before save.
    </div>
  ) : null

  const bookingSlot = isFirstBookingThenLr ? (
    <Select
      label="Booking No. *"
      value={form.bookingId}
      options={bookingOptions}
      onChange={(e) => {
        const bookingId = e.target.value
        update('bookingId', bookingId)
        if (bookingId) {
          lrApi.prefillFromBooking(bookingId)
            .then((prefill) => setForm((prev) => ({ ...prev, ...prefill, bookingId: prefill.bookingId })))
            .catch((err) => toast({ title: 'Booking load failed', message: err.message, type: 'warning' }))
        }
      }}
    />
  ) : (
    <Input label="Booking No." value={form.bookingId} onChange={(e) => update('bookingId', e.target.value)} />
  )

  return (
    <ERPContentPage module="LR" title="Lorry Receipt (LR Entry)">
      <div ref={formRef} data-kbd-form-root>
      <LrEntryFormLayout
        form={form}
        setForm={setForm}
        update={update}
        saving={saving}
        onSave={() => handleSave(false)}
        onSavePrint={() => handleSave(true)}
        onPreview={() => print(<LRPrintFormat lr={buildLrApiPayload(form)} company={company} />)}
        onClear={() => setForm(emptyLrEntryForm())}
        onCancel={() => navigate('/lr/list')}
        bookingSlot={bookingSlot}
        flowBanner={flowBanner}
      />
      </div>
    </ERPContentPage>
  )
}
