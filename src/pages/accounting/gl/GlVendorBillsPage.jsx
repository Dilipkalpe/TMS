import { useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import LookupSelect from '../../../components/ui/LookupSelect'
import { glApi, vendorsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { Plus, Loader2 } from 'lucide-react'
import { withBranchColumn } from '../../../utils/branchColumns'

export default function GlVendorBillsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [vendorName, setVendorName] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vendorId: '', billDate: new Date().toISOString().slice(0, 10),
    taxableAmount: '', igstAmount: '', tdsAmount: '', narration: '', referenceNo: '',
  })

  const load = async () => {
    try { setRows(await glApi.vendorBills() || []) }
    catch (err) { toast({ title: 'Load failed', message: err.message, type: 'error' }) }
  }
  useEffect(() => { load() }, [])

  const resolveVendor = async (name) => {
    setVendorName(name)
    try {
      const res = await vendorsApi.list({ search: name, pageSize: 5 })
      const items = res?.items || res || []
      const match = items.find((v) => v.name?.toLowerCase() === name.toLowerCase()) || items[0]
      setForm((f) => ({ ...f, vendorId: match?.id || '' }))
    } catch { setForm((f) => ({ ...f, vendorId: '' })) }
  }

  const handleSave = async () => {
    if (!form.vendorId || !Number(form.taxableAmount)) {
      toast({ title: 'Validation', message: 'Vendor and taxable amount required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await glApi.createVendorBill({
        ...form,
        taxableAmount: Number(form.taxableAmount),
        igstAmount: Number(form.igstAmount) || 0,
        tdsAmount: Number(form.tdsAmount) || 0,
      })
      toast({ title: 'Vendor bill posted', message: `${res.billNo} · GL ${res.accountingVoucherId ? 'yes' : 'pending'}`, type: 'success' })
      setForm((f) => ({ ...f, taxableAmount: '', igstAmount: '', tdsAmount: '', narration: '' }))
      await load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally { setSaving(false) }
  }

  const columns = withBranchColumn([
    { key: 'billNo', label: 'Bill No' },
    { key: 'billDate', label: 'Date' },
    { key: 'vendorName', label: 'Vendor' },
    { key: 'taxableAmount', label: 'Taxable', render: (r) => formatCurrency(r.taxableAmount) },
    { key: 'totalAmount', label: 'Total', render: (r) => formatCurrency(r.totalAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance) },
    { key: 'status', label: 'Status' },
  ], { afterKey: 'billNo' })

  return (
    <ERPContentPage module="Accounting" title="Vendor Bills (AP)">
      <Card>
        <CardHeader title="Create Vendor Bill" subtitle="Bill → Payable → Payment settlement cycle" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LookupSelect label="Vendor *" type="vendors" value={vendorName} onChange={resolveVendor} />
          <Input label="Bill Date" type="date" value={form.billDate} onChange={(e) => setForm((f) => ({ ...f, billDate: e.target.value }))} />
          <Input label="Taxable Amount *" type="number" value={form.taxableAmount} onChange={(e) => setForm((f) => ({ ...f, taxableAmount: e.target.value }))} />
          <Input label="IGST" type="number" value={form.igstAmount} onChange={(e) => setForm((f) => ({ ...f, igstAmount: e.target.value }))} />
          <Input label="TDS" type="number" value={form.tdsAmount} onChange={(e) => setForm((f) => ({ ...f, tdsAmount: e.target.value }))} />
          <Input label="Reference" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
          <div className="sm:col-span-2"><Input label="Narration" value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} /></div>
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={handleSave}>
          {saving ? 'Posting…' : 'Post Vendor Bill'}
        </Button>
      </Card>
      <Card className="mt-4" padding={false}>
        <ERPDataTable columns={columns} data={rows} showActions={false} selectable={false} />
      </Card>
    </ERPContentPage>
  )
}
