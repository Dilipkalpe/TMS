import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection } from '../../components/ops/OpsFormParts'
import { OpsInvoiceItemsTable } from '../../components/ops/OpsPhase2Parts'
import { Receipt, ArrowLeft } from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { amountToWords } from '../../utils/amountWords'

function CreateInvoiceForm({ lrNumber, lr, process, saving, runSave, onBack }) {
  const navigate = useNavigate()
  const invoice = process?.invoice
  const [form, setForm] = useState({
    billingType: lr.paymentType || 'To Pay',
    notes: '',
    paymentMode: 'Bank Transfer',
    paymentRef: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  })
  const [lineItems, setLineItems] = useState(null)
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const summary = useMemo(() => {
    const items = lineItems || []
    if (items.length) {
      const taxable = items.reduce((s, r) => s + Number(r.qty || 1) * Number(r.rate || 0), 0)
      const gst = items.reduce((s, r) => {
        const amt = Number(r.qty || 1) * Number(r.rate || 0)
        return s + amt * Number(r.gstPct || 0) / 100
      }, 0)
      const grand = taxable + gst
      return { freight: taxable, gst, grand, outstanding: Number(lr.balance ?? grand) }
    }
    const freight = Number(lr.freight || 0) + Number(lr.loadingCharges || 0) + Number(lr.unloadingCharges || 0)
    const gst = Number(lr.gst || 0)
    const grand = freight + gst
    return { freight, gst, grand, outstanding: Number(lr.balance ?? grand) }
  }, [lr, lineItems])

  const handleSave = () => runSave('Freight invoice generated', () =>
    lrProcessApi.createInvoice(lrNumber, {
      billType: 'FC',
      paymentType: form.billingType,
      notes: form.notes,
      lineItems,
      amountInWords: amountToWords(summary.grand),
      paymentDetails: {
        mode: form.paymentMode,
        reference: form.paymentRef,
        date: form.paymentDate,
      },
    }))

  return (
    <ERPContentPage module="Billing" title="Create Invoice" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader
          title="Billing / Invoice"
          breadcrumb={`Home / Billing / Create Invoice / ${lrNumber}`}
          actions={<Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back to list</Button>}
        />

        <div className="grid shrink-0 gap-1 lg:grid-cols-3">
          <OpsSection title="Invoice Details" icon={Receipt}>
            <OpsGrid cols={2}>
              <Input label="Invoice No." value={invoice?.invoiceNumber || 'Auto on save'} readOnly />
              <Input label="Invoice Date" type="date" value={new Date().toISOString().slice(0, 10)} readOnly />
              <Input label="LR No." value={lrNumber} readOnly />
              <Select label="Billing Type" options={['To Pay', 'Paid', 'TBB', 'To Be Billed']} value={form.billingType} onChange={(e) => u('billingType', e.target.value)} />
              <Input label="Customer" className="sm:col-span-2" value={lr.customerName || lr.consignor || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Reference Details">
            <OpsGrid cols={2}>
              <Input label="Consignor" value={lr.consignor || '—'} readOnly />
              <Input label="Consignee" value={lr.consignee || '—'} readOnly />
              <Input label="Route" className="sm:col-span-2" value={`${lr.from || '—'} → ${lr.to || '—'}`} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Amounts Summary">
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between"><dt>Taxable</dt><dd>{formatCurrency(summary.freight)}</dd></div>
              <div className="flex justify-between"><dt>GST</dt><dd>{formatCurrency(summary.gst)}</dd></div>
              <div className="flex justify-between border-t pt-1 font-bold text-primary"><dt>Grand Total</dt><dd>{formatCurrency(summary.grand)}</dd></div>
              <div className="flex justify-between font-bold text-red-600"><dt>Outstanding</dt><dd>{formatCurrency(summary.outstanding)}</dd></div>
              <p className="border-t pt-1 text-[10px] italic text-slate-600">{amountToWords(summary.grand)}</p>
            </dl>
          </OpsSection>
        </div>

        <OpsSection title="Invoice Line Items" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <OpsInvoiceItemsTable items={lineItems} onChange={setLineItems} lr={lr} />
        </OpsSection>

        <OpsSection title="Payment Details">
          <OpsGrid cols={3}>
            <Select label="Payment Mode" options={['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Credit']} value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} />
            <Input label="Reference / Cheque No." value={form.paymentRef} onChange={(e) => u('paymentRef', e.target.value)} />
            <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => u('paymentDate', e.target.value)} />
          </OpsGrid>
        </OpsSection>

        <Textarea label="Additional Notes" rows={2} maxLength={200} value={form.notes} onChange={(e) => u('notes', e.target.value)} />

        <OpsFooter saving={saving} onCancel={() => navigate('/lr?status=pod-uploaded')} onSave={handleSave} onSavePrint={handleSave} />
      </div>
    </ERPContentPage>
  )
}

export default function CreateInvoicePage() {
  return (
    <OpsLrQueueGate
      module="Billing"
      title="Create Invoice"
      stage="pod-uploaded"
      processStep="invoice"
      basePath="/operations/billing/invoice"
      queueHint="Select an LR with POD uploaded to generate a freight invoice (CRUD)."
    >
      {(ctx) => <CreateInvoiceForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
