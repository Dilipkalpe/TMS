import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection } from '../../components/ops/OpsFormParts'
import { Receipt, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useToast } from '../../context/ToastContext'

const DEFAULT_ITEMS = [
  { id: 1, particulars: 'Freight Charges', hsn: '9965', qty: '1', unit: 'Trip', rate: 7500, amount: 7500, gstPct: 18, gstAmt: 1350, total: 8850 },
  { id: 2, particulars: 'Loading Charges', hsn: '9965', qty: '1', unit: 'Trip', rate: 500, amount: 500, gstPct: 18, gstAmt: 90, total: 590 },
]

export default function CreateInvoicePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [form, setForm] = useState({
    invoiceNo: 'INV250500123', invoiceDate: '2025-05-06', invoiceType: 'Original',
    billingType: 'To Pay', customer: 'Techno Electricals', gstin: '06AAECT9876F1Z2',
    billingAddress: 'Plot No. 45, Sector-8, Bawal, Haryana',
    lrNo: 'LR250500101', tripNo: 'TRP25050045', poNo: 'PO-4587',
    freightType: 'Full Truck Load', paymentTerms: '15 Days', dueDate: '2025-05-21',
    amountWords: 'Rupees Eight Thousand Eight Hundred Fifty Only',
    paymentMode: 'Bank Transfer', bankName: 'HDFC Bank', accountNo: '50200012345678', ifsc: 'HDFC0001234',
    notes: 'Payment within 15 days of invoice date.',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const summary = useMemo(() => {
    const sub = items.reduce((s, i) => s + i.amount, 0)
    const gst = items.reduce((s, i) => s + i.gstAmt, 0)
    const grand = items.reduce((s, i) => s + i.total, 0)
    return { sub, gst, grand, outstanding: grand }
  }, [items])

  return (
    <ERPContentPage module="Billing" title="Create Invoice" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader title="Billing / Invoice" breadcrumb="Home / Billing / Create Invoice" />

        <div className="grid shrink-0 gap-1 lg:grid-cols-3">
          <OpsSection title="Invoice Details" icon={Receipt}>
            <OpsGrid cols={2}>
              <Input label="Invoice No." value={form.invoiceNo} readOnly />
              <Input label="Invoice Date" type="date" value={form.invoiceDate} onChange={(e) => u('invoiceDate', e.target.value)} />
              <Select label="Invoice Type" options={['Original', 'Duplicate', 'Proforma']} value={form.invoiceType} onChange={(e) => u('invoiceType', e.target.value)} />
              <Select label="Billing Type" options={['To Pay', 'Paid', 'TBB']} value={form.billingType} onChange={(e) => u('billingType', e.target.value)} />
              <Input label="Customer" value={form.customer} onChange={(e) => u('customer', e.target.value)} />
              <Input label="GSTIN" value={form.gstin} onChange={(e) => u('gstin', e.target.value)} />
              <Textarea label="Billing Address" rows={2} className="sm:col-span-2" value={form.billingAddress} onChange={(e) => u('billingAddress', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Reference Details">
            <OpsGrid cols={2}>
              <Input label="LR No." value={form.lrNo} onChange={(e) => u('lrNo', e.target.value)} />
              <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
              <Input label="PO No." value={form.poNo} onChange={(e) => u('poNo', e.target.value)} />
              <Select label="Freight Type" options={['Full Truck Load', 'Part Load']} value={form.freightType} onChange={(e) => u('freightType', e.target.value)} />
              <Select label="Payment Terms" options={['15 Days', '30 Days', 'Immediate']} value={form.paymentTerms} onChange={(e) => u('paymentTerms', e.target.value)} />
              <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => u('dueDate', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Amounts Summary">
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between"><dt>Sub Total</dt><dd>{formatCurrency(summary.sub)}</dd></div>
              <div className="flex justify-between"><dt>GST (18%)</dt><dd>{formatCurrency(summary.gst)}</dd></div>
              <div className="flex justify-between border-t pt-1 text-sm font-bold text-primary"><dt>Grand Total</dt><dd>{formatCurrency(summary.grand)}</dd></div>
              <div className="flex justify-between text-red-600"><dt>Outstanding</dt><dd className="font-bold">{formatCurrency(summary.outstanding)}</dd></div>
            </dl>
          </OpsSection>
        </div>

        <OpsSection title="Invoice Items" className="flex min-h-0 flex-1 flex-col overflow-hidden"
          action={<Button size="sm" icon={Plus} onClick={() => setItems((r) => [...r, { id: Date.now(), particulars: '', hsn: '', qty: '1', unit: 'Trip', rate: 0, amount: 0, gstPct: 18, gstAmt: 0, total: 0 }])}>Add Item</Button>}
        >
          <div className="lr-entry-items-scroll">
            <table className="w-full min-w-[900px] text-[11px]">
              <thead className="sticky top-0 bg-primary text-white">
                <tr>
                  {['#', 'Particulars', 'HSN', 'Qty/Unit', 'Rate', 'Amount', 'GST%', 'GST Amt', 'Total', ''].map((h) => (
                    <th key={h} className="px-1 py-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-1 py-0.5">{idx + 1}</td>
                    <td className="px-1 py-0.5"><input className="w-full rounded border px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900" value={item.particulars} onChange={(e) => { const v = [...items]; v[idx].particulars = e.target.value; setItems(v) }} /></td>
                    <td className="px-1 py-0.5"><input className="w-14 rounded border px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900" value={item.hsn} onChange={(e) => { const v = [...items]; v[idx].hsn = e.target.value; setItems(v) }} /></td>
                    <td className="px-1 py-0.5">{item.qty} {item.unit}</td>
                    <td className="px-1 py-0.5">{formatCurrency(item.rate)}</td>
                    <td className="px-1 py-0.5">{formatCurrency(item.amount)}</td>
                    <td className="px-1 py-0.5">{item.gstPct}%</td>
                    <td className="px-1 py-0.5">{formatCurrency(item.gstAmt)}</td>
                    <td className="px-1 py-0.5 font-semibold">{formatCurrency(item.total)}</td>
                    <td className="px-1 py-0.5"><button type="button" className="text-red-500" onClick={() => setItems((r) => r.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsSection>

        <OpsGrid cols={3}>
          <Textarea label="Amount In Words" rows={1} value={form.amountWords} onChange={(e) => u('amountWords', e.target.value)} />
          <OpsSection title="Payment Details">
            <OpsGrid cols={2}>
              <Select label="Payment Mode" options={['Bank Transfer', 'Cash', 'Cheque', 'UPI']} value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} />
              <Input label="Bank Name" value={form.bankName} onChange={(e) => u('bankName', e.target.value)} />
              <Input label="Account No." value={form.accountNo} onChange={(e) => u('accountNo', e.target.value)} />
              <Input label="IFSC" value={form.ifsc} onChange={(e) => u('ifsc', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <Textarea label={`Notes (${form.notes.length}/200)`} rows={1} maxLength={200} value={form.notes} onChange={(e) => u('notes', e.target.value)} />
        </OpsGrid>

        <OpsFooter
          onCancel={() => navigate('/accounting/freight-invoices')}
          onSave={() => toast({ title: 'Invoice saved', type: 'success' })}
          onSavePrint={() => toast({ title: 'Saved & Print', type: 'success' })}
          extra={<Button size="sm" variant="outline">Preview</Button>}
        />
      </div>
    </ERPContentPage>
  )
}
