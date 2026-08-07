import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { PackageCheck, User, ArrowLeft } from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { parsePackagesWeight } from '../../utils/lrDisplayHelpers'

function DeliveryCompleteForm({ lrNumber, lr, process, saving, runSave, onBack }) {
  const navigate = useNavigate()
  const delivery = process?.deliverySheet
  const pkg = parsePackagesWeight(lr.quantity)
  const [form, setForm] = useState({
    tripNo: lr.vehicle || '',
    deliveryDate: delivery?.deliveryDate || new Date().toISOString().slice(0, 10),
    deliveryTime: '16:35',
    deliveryBranch: lr.branchName || '',
    packagesTotal: pkg.packages,
    packagesReceived: pkg.packages,
    packagesDamaged: 0,
    actualWeight: pkg.weight,
    chargedWeight: pkg.weight,
    deliveryStatus: 'Delivered',
    receiverName: delivery?.receiverName || lr.consignee || '',
    receiverDesignation: '',
    receiverMobile: '',
    remarks: delivery?.remarks || '',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (delivery) {
      setForm((f) => ({
        ...f,
        deliveryDate: delivery.deliveryDate || f.deliveryDate,
        receiverName: delivery.receiverName || lr.consignee || '',
        remarks: delivery.remarks || '',
        deliveryStatus: delivery.shipmentStatus === 'Delivered' ? 'Delivered' : f.deliveryStatus,
      }))
    }
  }, [delivery, lr])

  const handleSave = () => runSave('Delivery completed', () =>
    lrProcessApi.saveDeliverySheet(lrNumber, {
      shipmentStatus: 'Delivered',
      deliveryDate: form.deliveryDate,
      deliveryLocation: lr.to,
      receiverName: form.receiverName,
      remarks: form.remarks,
    }))

  return (
    <ERPContentPage module="Operations" title="Delivery Complete" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader
          title="Delivery Complete"
          breadcrumb={`Home / Delivery / Delivery Complete / ${lrNumber}`}
          status="DELIVERY COMPLETED"
          actions={<Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back to list</Button>}
        />

        <OpsGrid cols={4}>
          <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
          <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => u('deliveryDate', e.target.value)} />
          <Input label="Delivery Time" type="time" value={form.deliveryTime} onChange={(e) => u('deliveryTime', e.target.value)} />
          <Input label="Delivery Branch" value={form.deliveryBranch} onChange={(e) => u('deliveryBranch', e.target.value)} />
        </OpsGrid>

        <OpsGrid cols={2}>
          <OpsSection title="Customer / Consignee" icon={User}>
            <OpsGrid cols={2}>
              <Input label="Consignee Name" value={lr.consignee || '—'} readOnly />
              <Input label="Customer" value={lr.customerName || lr.consignor || '—'} readOnly />
              <Input label="Address" className="sm:col-span-2" value={lr.to || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="LR Details" icon={PackageCheck}>
            <OpsGrid cols={3}>
              <Input label="LR No." value={lrNumber} readOnly />
              <Input label="LR Date" value={lr.lrDate || '—'} readOnly />
              <Input label="Freight Type" value={lr.paymentType || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <OpsGrid cols={2}>
          <OpsSection title="Received By">
            <OpsGrid cols={3}>
              <Input label="Receiver Name" value={form.receiverName} onChange={(e) => u('receiverName', e.target.value)} />
              <Input label="Designation" value={form.receiverDesignation} onChange={(e) => u('receiverDesignation', e.target.value)} />
              <Input label="Mobile" value={form.receiverMobile} onChange={(e) => u('receiverMobile', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Delivery Details">
            <OpsGrid cols={3}>
              <Input label="No. of Packages" type="number" value={form.packagesTotal} onChange={(e) => u('packagesTotal', e.target.value)} />
              <Input label="Received Packages" type="number" value={form.packagesReceived} onChange={(e) => u('packagesReceived', e.target.value)} />
              <Input label="Damaged Packages" type="number" value={form.packagesDamaged} onChange={(e) => u('packagesDamaged', e.target.value)} />
              <Input label="Actual Weight (Kg)" value={form.actualWeight} onChange={(e) => u('actualWeight', e.target.value)} />
              <Input label="Charged Weight (Kg)" value={form.chargedWeight} onChange={(e) => u('chargedWeight', e.target.value)} />
              <Select label="Delivery Status" options={['Delivered', 'Partial', 'Refused']} value={form.deliveryStatus} onChange={(e) => u('deliveryStatus', e.target.value)} />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <Textarea label="Remarks" rows={2} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />

        <OpsFooter
          saving={saving}
          onCancel={() => navigate('/operations/delivery-complete/list')}
          onSave={handleSave}
          onSavePrint={() => { handleSave(); navigate(`/operations/delivery/pod?lr=${encodeURIComponent(lrNumber)}`) }}
          extra={<Button size="sm" className="bg-green-600" onClick={() => navigate(`/operations/delivery/pod?lr=${encodeURIComponent(lrNumber)}`)}>Save & Next POD</Button>}
        />
      </div>
    </ERPContentPage>
  )
}

export default function DeliveryCompletePage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Delivery Complete"
      stage="dispatched"
      processStep="delivery"
      basePath="/operations/delivery-complete"
      queueHint="Select an in-transit / dispatched LR to confirm delivery at destination."
    >
      {(ctx) => <DeliveryCompleteForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
