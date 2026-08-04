import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import LookupSelect from '../../components/ui/LookupSelect'
import DriverLookupSelect from '../../components/ui/DriverLookupSelect'
import { lrApi, consignorsApi, consigneesApi } from '../../services/api'
import PartyMasterSelect from '../../components/masters/PartyMasterSelect'
import { applyConsignorToLrForm, applyConsigneeToLrForm } from '../../utils/partyMasterLr'
import { LR_BUSINESS_TYPES, LR_BUSINESS_TYPE_LABELS } from '../../constants/lrBusinessTypes'
import { fromDocPath } from '../../utils/docPath'
import { useToast } from '../../context/ToastContext'
import { Save, ArrowLeft, Printer, Loader2, Workflow } from 'lucide-react'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { lrProcessPath } from '../../utils/docPath'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']

function mapLrToForm(lr) {
  return {
    lrNumber: lr.lrNumber,
    lrDate: lr.lrDate,
    consignorId: lr.consignorId ?? '',
    consigneeId: lr.consigneeId ?? '',
    consignor: lr.consignor ?? '',
    consignee: lr.consignee ?? '',
    consignorContact: '',
    consignorPhone: '',
    consignorGst: '',
    consignorAddress: '',
    consigneeContact: '',
    consigneePhone: '',
    consigneeGst: '',
    consigneeAddress: '',
    from: lr.from ?? '',
    to: lr.to ?? '',
    vehicle: lr.vehicle ?? '',
    driver: lr.driver ?? '',
    material: lr.material ?? '',
    quantity: lr.quantity ?? '',
    freight: lr.freight ?? 0,
    gst: lr.gst ?? 0,
    hamali: lr.hamali ?? 0,
    loadingCharges: lr.loadingCharges ?? 0,
    unloadingCharges: lr.unloadingCharges ?? 0,
    insurance: lr.insurance ?? 0,
    advance: lr.advance ?? 0,
    balance: lr.balance ?? 0,
    paymentType: lr.paymentType ?? 'To Pay',
    businessType: lr.businessType ?? 'FTL',
    remarks: lr.remarks ?? '',
  }
}

function calcBalance(next) {
  const total = Number(next.freight) + Number(next.gst) + Number(next.hamali)
    + Number(next.loadingCharges) + Number(next.unloadingCharges) + Number(next.insurance)
  return total - Number(next.advance)
}

export default function EditLR() {
  const { lrNumber: rawLrNumber } = useParams()
  const lrNumber = fromDocPath(rawLrNumber)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [form, setForm] = useState(null)
  const [lrStatus, setLrStatus] = useState('LR Created')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    lrApi.get(lrNumber)
      .then(async (lr) => {
        if (cancelled) return
        const base = mapLrToForm(lr)
        if (lr.consignorId) {
          try {
            const c = await consignorsApi.get(lr.consignorId)
            Object.assign(base, {
              consignorContact: c.contact ?? '',
              consignorPhone: c.phone ?? '',
              consignorGst: c.gst ?? '',
              consignorAddress: c.address ?? '',
            })
          } catch { /* legacy LR without master row */ }
        }
        if (lr.consigneeId) {
          try {
            const c = await consigneesApi.get(lr.consigneeId)
            Object.assign(base, {
              consigneeContact: c.contact ?? '',
              consigneePhone: c.phone ?? '',
              consigneeGst: c.gst ?? '',
              consigneeAddress: c.address ?? '',
            })
          } catch { /* legacy */ }
        }
        setForm(base)
        setLrStatus(lr.status || 'LR Created')
      })
      .catch((err) => {
        if (!cancelled) toast({ title: 'Load failed', message: err.message, type: 'error' })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lrNumber, toast])

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      next.balance = calcBalance(next)
      return next
    })
  }

  const handleSave = async () => {
    if (!form.consignorId && !form.consignor?.trim()) {
      toast({ title: 'Validation', message: 'Consignor is required.', type: 'warning' })
      return
    }
    if (!form.consigneeId && !form.consignee?.trim()) {
      toast({ title: 'Validation', message: 'Consignee is required.', type: 'warning' })
      return
    }
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'From and To locations are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await lrApi.update(lrNumber, form)
      toast({ title: 'LR updated', message: `${lrNumber} saved successfully.`, type: 'success' })
      navigate('/lr')
    } catch (err) {
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    print(<LRPrintFormat lr={form} company={company} />)
  }

  if (loading || !form) {
    return (
      <ERPContentPage module="LR Management" title="Edit LR">
        <p className="text-sm text-slate-500">Loading LR…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="LR Management" title={`Edit LR ${lrNumber}`}>
      <Card className="mb-4 p-4">
        <LrStatusFlow currentStatus={lrStatus} layout="horizontal" />
        <div className="mt-3 flex justify-end">
          <Button variant="outline" icon={Workflow} onClick={() => navigate(lrProcessPath(lrNumber))}>
            Open full process flow
          </Button>
        </div>
      </Card>
      <Card className="mb-4">
        <CardHeader title="Consignor (From)" />
        <div className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          <PartyMasterSelect
            label="Consignor"
            api={consignorsApi}
            valueId={form.consignorId}
            displayValue={form.consignor}
            onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsignorToLrForm(row), balance: calcBalance({ ...prev, ...applyConsignorToLrForm(row) }) }))}
          />
          <Input label="Contact Person" value={form.consignorContact} onChange={(e) => update('consignorContact', e.target.value)} />
          <Input label="Mobile" value={form.consignorPhone} onChange={(e) => update('consignorPhone', e.target.value)} />
          <Input label="GST No." value={form.consignorGst} onChange={(e) => update('consignorGst', e.target.value)} />
          <Input label="From Location" value={form.from} onChange={(e) => update('from', e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input label="Address" value={form.consignorAddress} onChange={(e) => update('consignorAddress', e.target.value)} />
          </div>
        </div>
      </Card>
      <Card className="mb-4">
        <CardHeader title="Consignee (To)" />
        <div className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          <PartyMasterSelect
            label="Consignee"
            api={consigneesApi}
            valueId={form.consigneeId}
            displayValue={form.consignee}
            onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsigneeToLrForm(row), balance: calcBalance({ ...prev, ...applyConsigneeToLrForm(row) }) }))}
          />
          <Input label="Contact Person" value={form.consigneeContact} onChange={(e) => update('consigneeContact', e.target.value)} />
          <Input label="Mobile" value={form.consigneePhone} onChange={(e) => update('consigneePhone', e.target.value)} />
          <Input label="GST No." value={form.consigneeGst} onChange={(e) => update('consigneeGst', e.target.value)} />
          <Input label="To Location" value={form.to} onChange={(e) => update('to', e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input label="Address" value={form.consigneeAddress} onChange={(e) => update('consigneeAddress', e.target.value)} />
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="LR Details" subtitle="Shipment, charges, and payment" />
        <div className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="LR Number" value={form.lrNumber} readOnly />
          <Input label="LR Date" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
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
          <Select
            label="Business Type"
            options={LR_BUSINESS_TYPES.map((t) => ({ value: t, label: LR_BUSINESS_TYPE_LABELS[t] }))}
            value={form.businessType}
            onChange={(e) => update('businessType', e.target.value)}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea label="Remarks" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Update LR'}</Button>
          <Button variant="outline" icon={Workflow} onClick={() => navigate(lrProcessPath(lrNumber))}>Process Flow</Button>
          <Button variant="outline" icon={Printer} onClick={handlePrint}>Print LR</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/lr')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
