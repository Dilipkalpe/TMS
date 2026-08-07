import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { OpsFooter, OpsGrid, OpsLrTable, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { ClipboardList, Truck, MapPin, User } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const SAMPLE_LRS = [
  { lrNumber: 'LR250500101', lrDate: '06/05/2025', customer: 'Swift Industrial', consignee: 'Techno Electricals', destination: 'Nagpur', packages: 12, actualWeight: '980.000', chargedWeight: '1200.000' },
  { lrNumber: 'LR250500102', lrDate: '06/05/2025', customer: 'Mahesh Industries', consignee: 'Global Traders', destination: 'Nagpur', packages: 10, actualWeight: '850.000', chargedWeight: '1050.000' },
]

export default function LoadingSlipPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [rows, setRows] = useState(SAMPLE_LRS)
  const [form, setForm] = useState({
    slipNo: 'LS250500123', date: '2025-05-06', time: '10:30', branch: 'Pune Main Branch',
    plannedBy: 'Rohit Sharma', vehicle: 'MH12AB1234', vehicleType: '14 FEET',
    driver: 'Suresh Patil', driverMobile: '9876543210', transporter: 'Shree Ganesh Transport',
    tripNo: 'TRP25050045', from: 'Pune Main Branch', to: 'Nagpur Branch',
    route: 'Pune - Ahmednagar - Aurangabad - Nagpur', expectedDelivery: '2025-05-08',
    loader: 'Ramesh Yadav', loaderMobile: '9012345678', supervisor: 'Mahesh Kale',
    supervisorMobile: '9898765432', sealNo: 'SGT125698', remarks: 'All LR scanned and verified.',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const totals = useMemo(() => ({
    packages: rows.reduce((s, r) => s + Number(r.packages), 0),
    actualWeight: rows.reduce((s, r) => s + parseFloat(r.actualWeight), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + parseFloat(r.chargedWeight), 0).toFixed(3),
  }), [rows])

  return (
    <ERPContentPage module="Operations" title="Loading Slip" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader title="Loading Slip" breadcrumb="Home / Loading Slip / Create" status="LOADING COMPLETED" />

        <OpsGrid cols={5}>
          <Input label="Loading Slip No." value={form.slipNo} readOnly />
          <Input label="Date & Time" type="datetime-local" value={`${form.date}T10:30`} onChange={(e) => u('date', e.target.value.slice(0, 10))} />
          <Select label="Branch / Warehouse" options={['Pune Main Branch', 'Nagpur Branch']} value={form.branch} onChange={(e) => u('branch', e.target.value)} />
          <Select label="Planned By" options={['Rohit Sharma', 'Admin User']} value={form.plannedBy} onChange={(e) => u('plannedBy', e.target.value)} />
          <Input label="Loading Completed" value="06/05/2025 12:45 PM" readOnly />
        </OpsGrid>

        <div className="grid shrink-0 gap-1 lg:grid-cols-4">
          <OpsSection title="Vehicle Details" icon={Truck}>
            <OpsGrid cols={2}>
              <Input label="Vehicle No." value={form.vehicle} onChange={(e) => u('vehicle', e.target.value)} />
              <Input label="Type" value={form.vehicleType} onChange={(e) => u('vehicleType', e.target.value)} />
              <Input label="Driver" value={form.driver} onChange={(e) => u('driver', e.target.value)} />
              <Input label="Mobile" value={form.driverMobile} onChange={(e) => u('driverMobile', e.target.value)} />
              <Input label="Transporter" className="sm:col-span-2" value={form.transporter} onChange={(e) => u('transporter', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="LR Summary" icon={ClipboardList}>
            <OpsGrid cols={2}>
              <Input label="Total LR" readOnly value={String(rows.length)} />
              <Input label="Total Pkgs" readOnly value={String(totals.packages)} />
              <Input label="Act. Weight" readOnly value={`${totals.actualWeight} Kg`} />
              <Input label="Chg. Weight" readOnly value={`${totals.chargedWeight} Kg`} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Trip / Route" icon={MapPin}>
            <OpsGrid cols={2}>
              <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
              <Input label="Exp. Delivery" type="date" value={form.expectedDelivery} onChange={(e) => u('expectedDelivery', e.target.value)} />
              <Input label="From" value={form.from} onChange={(e) => u('from', e.target.value)} />
              <Input label="To" value={form.to} onChange={(e) => u('to', e.target.value)} />
              <Input label="Via / Route" className="sm:col-span-2" value={form.route} onChange={(e) => u('route', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Loader / Supervisor" icon={User}>
            <OpsGrid cols={2}>
              <Input label="Loader" value={form.loader} onChange={(e) => u('loader', e.target.value)} />
              <Input label="Loader Mobile" value={form.loaderMobile} onChange={(e) => u('loaderMobile', e.target.value)} />
              <Input label="Supervisor" value={form.supervisor} onChange={(e) => u('supervisor', e.target.value)} />
              <Input label="Sup. Mobile" value={form.supervisorMobile} onChange={(e) => u('supervisorMobile', e.target.value)} />
            </OpsGrid>
          </OpsSection>
        </div>

        <OpsSection title="LR Details to be Loaded" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <OpsLrTable rows={rows} totals={totals} onRemove={(i) => setRows((r) => r.filter((_, j) => j !== i))} onAdd={() => toast({ title: 'Add LR', message: 'Select from loading pending queue.', type: 'info' })} />
        </OpsSection>

        <OpsGrid cols={3}>
          <OpsSection title="Loading Checklist">
            {['All LR verified', 'Vehicle cleaned', 'Seal applied', 'Documents checked'].map((c) => (
              <label key={c} className="flex items-center gap-1 text-[10px]"><input type="checkbox" defaultChecked className="rounded" /> {c}</label>
            ))}
            <Input label="Seal Number" value={form.sealNo} onChange={(e) => u('sealNo', e.target.value)} />
          </OpsSection>
          <Textarea label="Loading Notes" rows={2} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
          <OpsSection title="Attachments">
            <p className="text-[10px] text-slate-500">LR_Summary.pdf · Vehicle_Photo.jpg</p>
            <Button size="sm" variant="outline" className="mt-1">+ Upload</Button>
          </OpsSection>
        </OpsGrid>

        <OpsFooter
          onCancel={() => navigate('/lr?status=loading-pending')}
          onSave={() => toast({ title: 'Saved', type: 'success' })}
          onSavePrint={() => toast({ title: 'Saved & Print', type: 'success' })}
          extra={<Button size="sm" className="bg-green-600" onClick={() => toast({ title: 'Loading Complete', type: 'success' })}>Loading Complete</Button>}
        />
      </div>
    </ERPContentPage>
  )
}
