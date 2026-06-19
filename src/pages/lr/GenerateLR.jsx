import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { defaultLR, lrList, vehicles, drivers, paymentTypes } from '../../data/lr'
import { Save, Printer, Download, Copy } from 'lucide-react'
import { formatCurrency } from '../../components/ui/ReportFilters'

export default function GenerateLR() {
  const [form, setForm] = useState({ ...defaultLR, consignor: 'Reliance Industries', consignee: 'Reliance Retail', from: 'Mumbai', to: 'Pune', vehicle: vehicles[0], driver: drivers[0], material: 'Electronics', quantity: '12 MT', freight: 28500, gst: 5130, hamali: 500, loadingCharges: 800, unloadingCharges: 600, insurance: 200, advance: 10000 })

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      const total = Number(next.freight) + Number(next.gst) + Number(next.hamali) + Number(next.loadingCharges) + Number(next.unloadingCharges) + Number(next.insurance)
      next.balance = total - Number(next.advance)
      return next
    })
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

  return (
    <ERPContentPage module="LR" title="Add New Record">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Generate New LR" subtitle="Fill in the LR details below" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="LR Number" value={form.lrNumber} onChange={(e) => update('lrNumber', e.target.value)} />
            <Input label="LR Date" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
            <Input label="Consignor" value={form.consignor} onChange={(e) => update('consignor', e.target.value)} />
            <Input label="Consignee" value={form.consignee} onChange={(e) => update('consignee', e.target.value)} />
            <Input label="From" value={form.from} onChange={(e) => update('from', e.target.value)} />
            <Input label="To" value={form.to} onChange={(e) => update('to', e.target.value)} />
            <Select label="Vehicle" options={vehicles} value={form.vehicle} onChange={(e) => update('vehicle', e.target.value)} />
            <Select label="Driver" options={drivers} value={form.driver} onChange={(e) => update('driver', e.target.value)} />
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
            <Select label="Payment Type" options={paymentTypes} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
            <div className="sm:col-span-2 lg:col-span-3">
              <Textarea label="Remarks" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button icon={Save}>Save</Button>
            <Button variant="outline" icon={Printer}>Print LR</Button>
            <Button variant="outline" icon={Download}>Download PDF</Button>
            <Button variant="outline" icon={Copy}>Duplicate LR</Button>
          </div>
        </Card>
        <Card padding={false} className="overflow-hidden">
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800 sm:px-4">
            <CardHeader title="Recent LR List" />
          </div>
          <ERPDataTable fill columns={lrColumns} data={lrList} showActions={false} />
        </Card>
      </div>
    </ERPContentPage>
  )
}
