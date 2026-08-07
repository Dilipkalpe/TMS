import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { OpsFooter, OpsGrid, OpsLrTable, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { FileBadge, Truck, Route } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const SAMPLE_LRS = [
  { lrNumber: 'LR250500101', lrDate: '06/05/2025', customer: 'Swift Industrial', consignee: 'Techno Electricals', destination: 'Nagpur', packages: 12, actualWeight: '980.000', chargedWeight: '1200.000' },
  { lrNumber: 'LR250500102', lrDate: '06/05/2025', customer: 'Mahesh Industries', consignee: 'Global Traders', destination: 'Nagpur', packages: 10, actualWeight: '850.000', chargedWeight: '1050.000' },
]

export default function TransitPassCreatePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [rows, setRows] = useState(SAMPLE_LRS)
  const [form, setForm] = useState({
    passNo: 'TP250500123', date: '2025-05-06', time: '10:15',
    fromBranch: 'Pune Main Branch', toBranch: 'Nagpur Branch',
    vehicle: 'MH12AB1234', vehicleType: '14 FEET', driver: 'Suresh Patil',
    driverMobile: '9876543210', transporter: 'Shree Ganesh Transport',
    tripNo: 'TRP25050045', via: 'Pune - Ahmednagar - Aurangabad - Nagpur',
    expectedDelivery: '2025-05-08', sealNo: 'SGT125698', sealCondition: 'Intact',
    transitType: 'By Road', remarks: 'Handle with care.',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const totals = useMemo(() => ({
    packages: rows.reduce((s, r) => s + Number(r.packages), 0),
    actualWeight: rows.reduce((s, r) => s + parseFloat(r.actualWeight), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + parseFloat(r.chargedWeight), 0).toFixed(3),
  }), [rows])

  return (
    <ERPContentPage module="Operations" title="Transit Pass" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader title="Transit Pass" breadcrumb="Home / Transit Pass / Create" status="ACTIVE" />

        <div className="grid shrink-0 gap-1 lg:grid-cols-[1fr_11rem]">
          <OpsSection title="Transit Pass Details" icon={FileBadge}>
            <OpsGrid cols={5}>
              <Input label="Pass No." value={form.passNo} readOnly />
              <Input label="Date" type="date" value={form.date} onChange={(e) => u('date', e.target.value)} />
              <Input label="Time" value={form.time} onChange={(e) => u('time', e.target.value)} />
              <Select label="From Branch" options={['Pune Main Branch', 'Nagpur Branch']} value={form.fromBranch} onChange={(e) => u('fromBranch', e.target.value)} />
              <Select label="To Branch" options={['Nagpur Branch', 'Pune Main Branch']} value={form.toBranch} onChange={(e) => u('toBranch', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsStatusPanel status="ACTIVE" rows={[
            { label: 'Created By', value: 'Admin User' },
            { label: 'Created On', value: '06/05/2025 10:15 AM' },
          ]} />
        </div>

        <OpsGrid cols={2}>
          <OpsSection title="Vehicle & Driver" icon={Truck}>
            <OpsGrid cols={3}>
              <Input label="Vehicle No." value={form.vehicle} onChange={(e) => u('vehicle', e.target.value)} />
              <Input label="Vehicle Type" value={form.vehicleType} onChange={(e) => u('vehicleType', e.target.value)} />
              <Input label="Transporter" value={form.transporter} onChange={(e) => u('transporter', e.target.value)} />
              <Input label="Driver Name" value={form.driver} onChange={(e) => u('driver', e.target.value)} />
              <Input label="Driver Mobile" value={form.driverMobile} onChange={(e) => u('driverMobile', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Trip Details">
            <OpsGrid cols={3}>
              <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
              <Input label="LR Count" readOnly value={String(rows.length)} />
              <Input label="Total Pkgs" readOnly value={String(totals.packages)} />
              <Input label="Act. Weight" readOnly value={totals.actualWeight} />
              <Input label="Chg. Weight" readOnly value={totals.chargedWeight} />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <OpsSection title="Route & Schedule" icon={Route}>
          <OpsGrid cols={5}>
            <Input label="Via / Route" value={form.via} onChange={(e) => u('via', e.target.value)} />
            <Input label="Expected Delivery" type="date" value={form.expectedDelivery} onChange={(e) => u('expectedDelivery', e.target.value)} />
            <Input label="Seal No." value={form.sealNo} onChange={(e) => u('sealNo', e.target.value)} />
            <Select label="Seal Condition" options={['Intact', 'Broken', 'Missing']} value={form.sealCondition} onChange={(e) => u('sealCondition', e.target.value)} />
            <Select label="Transit Type" options={['By Road', 'By Rail', 'Multimodal']} value={form.transitType} onChange={(e) => u('transitType', e.target.value)} />
          </OpsGrid>
        </OpsSection>

        <OpsSection title="LR Details (All LRs in this Transit)" className="flex min-h-0 flex-1 flex-col overflow-hidden"
          action={<Button size="sm" onClick={() => toast({ title: 'Add LR', type: 'info' })}>+ Add LR</Button>}
        >
          <OpsLrTable rows={rows} totals={totals} onRemove={(i) => setRows((r) => r.filter((_, j) => j !== i))} />
        </OpsSection>

        <OpsGrid cols={3}>
          <OpsSection title="Documents">
            <p className="text-[10px]">Vehicle RC.jpg · Insurance.pdf · Permit.pdf</p>
            <Button size="sm" variant="outline" className="mt-1">+ Upload More</Button>
          </OpsSection>
          <Textarea label="Remarks" rows={2} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
          <OpsSection title="Authorization">
            <OpsGrid cols={2}>
              <Input label="Prepared By" readOnly value="Admin User" />
              <Input label="Authorized By" readOnly value="Branch Manager" />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <OpsFooter
          onCancel={() => navigate('/lr?status=transit-pass-generated')}
          onSave={() => toast({ title: 'Transit Pass saved', type: 'success' })}
          onSavePrint={() => toast({ title: 'Saved & Print', type: 'success' })}
        />
      </div>
    </ERPContentPage>
  )
}
