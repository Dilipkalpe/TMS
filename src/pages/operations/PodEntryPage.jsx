import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { PackageCheck, MapPin, User, ArrowLeft } from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { parsePackagesWeight } from '../../utils/lrDisplayHelpers'

const SHIPMENT_STATUSES = ['In Transit', 'Delivered', 'POD Received', 'Closed']

function PodEntryForm({ lrNumber, lr, process, saving, runSave, onBack }) {
  const navigate = useNavigate()
  const delivery = process?.deliverySheet
  const pkg = parsePackagesWeight(lr.quantity)
  const [form, setForm] = useState({
    deliveryDate: delivery?.deliveryDate || new Date().toISOString().slice(0, 10),
    deliveryLocation: delivery?.deliveryLocation || lr.to || '',
    receiverName: delivery?.receiverName || lr.consignee || '',
    shipmentStatus: delivery?.shipmentStatus || 'Delivered',
    remarks: delivery?.remarks || '',
    packages: pkg.packages,
    actualWeight: pkg.weight,
    chargedWeight: pkg.weight,
    condition: 'Good',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (delivery) {
      setForm((f) => ({
        ...f,
        deliveryDate: delivery.deliveryDate || f.deliveryDate,
        deliveryLocation: delivery.deliveryLocation || lr.to || '',
        receiverName: delivery.receiverName || lr.consignee || '',
        shipmentStatus: delivery.shipmentStatus || 'Delivered',
        remarks: delivery.remarks || '',
      }))
    }
  }, [delivery, lr])

  const handleSave = () => runSave('POD / delivery saved', () =>
    lrProcessApi.saveDeliverySheet(lrNumber, {
      shipmentStatus: form.shipmentStatus,
      deliveryDate: form.deliveryDate,
      deliveryLocation: form.deliveryLocation,
      receiverName: form.receiverName,
      remarks: form.remarks,
    }))

  return (
    <ERPContentPage module="Operations" title="POD (Proof of Delivery)" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader
          title="POD (Proof of Delivery)"
          breadcrumb={`Home / Delivery / POD / ${lrNumber}`}
          status={form.shipmentStatus}
          actions={<Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back to list</Button>}
        />

        <div className="grid shrink-0 gap-1 lg:grid-cols-[1fr_11rem]">
          <OpsSection title="POD Information" icon={PackageCheck}>
            <OpsGrid cols={4}>
              <Input label="LR No." value={lrNumber} readOnly />
              <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => u('deliveryDate', e.target.value)} />
              <Select label="Delivery Status" options={SHIPMENT_STATUSES} value={form.shipmentStatus} onChange={(e) => u('shipmentStatus', e.target.value)} />
              <Input label="Vehicle" value={lr.vehicle || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsStatusPanel status={form.shipmentStatus} rows={[
            { label: 'LR Status', value: lr.status },
            { label: 'Freight', value: lr.paymentType || '—' },
          ]} />
        </div>

        <OpsGrid cols={2}>
          <OpsSection title="Customer / Consignee" icon={User}>
            <OpsGrid cols={2}>
              <Input label="Consignee" value={lr.consignee || '—'} readOnly />
              <Input label="Customer" value={lr.customerName || lr.consignor || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Delivery Location" icon={MapPin}>
            <OpsGrid cols={2}>
              <Input label="Delivery Address" value={form.deliveryLocation} onChange={(e) => u('deliveryLocation', e.target.value)} />
              <Input label="From → To" value={`${lr.from || '—'} → ${lr.to || '—'}`} readOnly />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <OpsGrid cols={4}>
          <Input label="Packages" type="number" value={form.packages} readOnly />
          <Input label="Actual Weight (Kg)" value={form.actualWeight} readOnly />
          <Input label="Charged Weight (Kg)" value={form.chargedWeight} readOnly />
          <Select label="Condition" options={['Good', 'Damaged', 'Short']} value={form.condition} onChange={(e) => u('condition', e.target.value)} />
        </OpsGrid>

        <OpsGrid cols={2}>
          <Input label="Receiver Name" value={form.receiverName} onChange={(e) => u('receiverName', e.target.value)} />
          <Textarea label="Remarks / Delivery Note" rows={2} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
        </OpsGrid>

        <OpsFooter saving={saving} onCancel={() => navigate('/lr?status=delivered')} onSave={handleSave} onSavePrint={handleSave} />
      </div>
    </ERPContentPage>
  )
}

export default function PodEntryPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="POD Entry"
      stage="delivered"
      processStep="delivery"
      basePath="/operations/delivery/pod"
      queueHint="Select a delivered LR to record POD and delivery details (CRUD)."
    >
      {(ctx) => <PodEntryForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
