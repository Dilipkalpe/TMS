import { useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { glApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { Download, Loader2, RefreshCw, Save } from 'lucide-react'

const fyStart = () => {
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}-04-01`
}
const today = () => new Date().toISOString().slice(0, 10)

export default function GlCompliancePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('gstr1')
  const [from, setFrom] = useState(fyStart())
  const [to, setTo] = useState(today())
  const [busy, setBusy] = useState(false)
  const [gstr1, setGstr1] = useState(null)
  const [gstr3b, setGstr3b] = useState(null)
  const [form26q, setForm26q] = useState(null)
  const [einvoice, setEinvoice] = useState(null)
  const [irnForm, setIrnForm] = useState({ invoiceId: '', irn: '', ackNo: '', ackDate: today() })

  const load = async () => {
    setBusy(true)
    try {
      const params = { from, to }
      if (tab === 'gstr1') setGstr1(await glApi.gstr1(params))
      else if (tab === 'gstr3b') setGstr3b(await glApi.gstr3b(params))
      else if (tab === '26q') setForm26q(await glApi.form26q(params))
      else setEinvoice(await glApi.eInvoices())
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const download26q = () => {
    const q = new URLSearchParams({ from, to }).toString()
    window.open(`/api/gl/compliance/form26q.csv?${q}`, '_blank')
  }

  const saveIrn = async () => {
    if (!irnForm.invoiceId) {
      toast({ title: 'Select invoice', type: 'error' })
      return
    }
    setBusy(true)
    try {
      await glApi.registerEInvoice(irnForm.invoiceId, {
        irn: irnForm.irn,
        ackNo: irnForm.ackNo,
        ackDate: irnForm.ackDate,
      })
      toast({ title: 'E-Invoice register updated', type: 'success' })
      setEinvoice(await glApi.eInvoices())
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'gstr1', label: 'GSTR-1' },
    { id: 'gstr3b', label: 'GSTR-3B' },
    { id: '26q', label: 'Form 26Q' },
    { id: 'einvoice', label: 'E-Invoice' },
  ]

  return (
    <ERPContentPage module="Accounting" title="GST / TDS Compliance">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'outline'} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab !== 'einvoice' && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button icon={busy ? Loader2 : RefreshCw} disabled={busy} onClick={load}>Refresh</Button>
            {tab === '26q' && (
              <Button variant="outline" icon={Download} onClick={download26q}>CSV Export</Button>
            )}
          </div>
        </Card>
      )}

      {tab === 'gstr1' && gstr1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{gstr1.note}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card><CardHeader title="B2B" /><p className="text-2xl font-semibold">{gstr1.summary?.b2bCount ?? 0}</p></Card>
            <Card><CardHeader title="B2C" /><p className="text-2xl font-semibold">{gstr1.summary?.b2cCount ?? 0}</p></Card>
            <Card><CardHeader title="Taxable" /><p className="text-2xl font-semibold">{formatCurrency((gstr1.summary?.taxableB2b ?? 0) + (gstr1.summary?.taxableB2c ?? 0))}</p></Card>
            <Card><CardHeader title="Total Tax" /><p className="text-2xl font-semibold">{formatCurrency(gstr1.summary?.totalTax ?? 0)}</p></Card>
          </div>
          <Card>
            <CardHeader title="B2B Invoices" />
            <ERPDataTable
              columns={[
                { key: 'invoiceNo', label: 'Invoice' },
                { key: 'invoiceDate', label: 'Date' },
                { key: 'customerName', label: 'Customer' },
                { key: 'gstin', label: 'GSTIN' },
                { key: 'taxableAmount', label: 'Taxable', render: (r) => formatCurrency(r.taxableAmount) },
                { key: 'igst', label: 'IGST', render: (r) => formatCurrency(r.igst) },
                { key: 'cgst', label: 'CGST', render: (r) => formatCurrency(r.cgst) },
                { key: 'sgst', label: 'SGST', render: (r) => formatCurrency(r.sgst) },
                { key: 'invoiceValue', label: 'Value', render: (r) => formatCurrency(r.invoiceValue) },
              ]}
              rows={gstr1.b2b || []}
            />
          </Card>
        </div>
      )}

      {tab === 'gstr3b' && gstr3b && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{gstr3b.note}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader title="Outward supplies" />
              <p>Taxable: {formatCurrency(gstr3b.outwardSupplies?.taxable)}</p>
              <p>Tax: {formatCurrency(gstr3b.outwardSupplies?.totalTax)}</p>
            </Card>
            <Card>
              <CardHeader title="Inward / ITC" />
              <p>Taxable: {formatCurrency(gstr3b.inwardSupplies?.taxable)}</p>
              <p>ITC: {formatCurrency(gstr3b.inwardSupplies?.totalTax)}</p>
            </Card>
            <Card>
              <CardHeader title="Net tax payable" />
              <p>IGST: {formatCurrency(gstr3b.netTaxPayable?.igst)}</p>
              <p>CGST: {formatCurrency(gstr3b.netTaxPayable?.cgst)}</p>
              <p>SGST: {formatCurrency(gstr3b.netTaxPayable?.sgst)}</p>
            </Card>
          </div>
        </div>
      )}

      {tab === '26q' && form26q && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{form26q.note}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardHeader title="Transactions" /><p className="text-2xl font-semibold">{form26q.summary?.txnCount ?? 0}</p></Card>
            <Card><CardHeader title="Base amount" /><p className="text-2xl font-semibold">{formatCurrency(form26q.summary?.baseAmount)}</p></Card>
            <Card><CardHeader title="TDS amount" /><p className="text-2xl font-semibold">{formatCurrency(form26q.summary?.tdsAmount)}</p></Card>
          </div>
          <Card>
            <CardHeader title="TDS payable rows" />
            <ERPDataTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'section', label: 'Section' },
                { key: 'partyName', label: 'Party' },
                { key: 'partyPan', label: 'PAN' },
                { key: 'ratePercent', label: 'Rate %' },
                { key: 'baseAmount', label: 'Base', render: (r) => formatCurrency(r.baseAmount) },
                { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
                { key: 'status', label: 'Status' },
              ]}
              rows={form26q.rows || []}
            />
          </Card>
        </div>
      )}

      {tab === 'einvoice' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{einvoice?.note || 'Local register — enter IRN from NIC portal.'}</p>
          <Card>
            <CardHeader title="Record IRN / Ack" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="Freight invoice Id" value={irnForm.invoiceId} onChange={(e) => setIrnForm((f) => ({ ...f, invoiceId: e.target.value }))} placeholder="Paste invoice GUID" />
              <Input label="IRN" value={irnForm.irn} onChange={(e) => setIrnForm((f) => ({ ...f, irn: e.target.value }))} />
              <Input label="Ack No" value={irnForm.ackNo} onChange={(e) => setIrnForm((f) => ({ ...f, ackNo: e.target.value }))} />
              <Input label="Ack Date" type="date" value={irnForm.ackDate} onChange={(e) => setIrnForm((f) => ({ ...f, ackDate: e.target.value }))} />
            </div>
            <div className="mt-3">
              <Button icon={busy ? Loader2 : Save} disabled={busy} onClick={saveIrn}>Save register</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Pending invoices" />
            <ERPDataTable
              columns={[
                { key: 'invoiceNo', label: 'Invoice' },
                { key: 'invoiceDate', label: 'Date' },
                { key: 'customerName', label: 'Customer' },
                { key: 'gstin', label: 'GSTIN' },
                { key: 'totalAmount', label: 'Amount', render: (r) => formatCurrency(r.totalAmount) },
                {
                  key: 'invoiceId',
                  label: '',
                  render: (r) => (
                    <Button variant="outline" onClick={() => setIrnForm((f) => ({ ...f, invoiceId: r.invoiceId }))}>
                      Use
                    </Button>
                  ),
                },
              ]}
              rows={einvoice?.pending || []}
            />
          </Card>
          <Card>
            <CardHeader title="Registered" />
            <ERPDataTable
              columns={[
                { key: 'invoiceNo', label: 'Invoice' },
                { key: 'invoiceDate', label: 'Date' },
                { key: 'customerName', label: 'Customer' },
                { key: 'irn', label: 'IRN' },
                { key: 'ackNo', label: 'Ack' },
                { key: 'status', label: 'Status' },
                { key: 'totalAmount', label: 'Amount', render: (r) => formatCurrency(r.totalAmount) },
              ]}
              rows={einvoice?.registered || []}
            />
          </Card>
        </div>
      )}
    </ERPContentPage>
  )
}
