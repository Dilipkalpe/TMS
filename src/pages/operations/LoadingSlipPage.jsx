import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsLrTable, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { ClipboardList, Truck, MapPin, User, ArrowLeft } from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { formatLrDate, parsePackagesWeight } from '../../utils/lrDisplayHelpers'

function mapLrRows(process, lr) {
  const items = process?.loadingSheet?.items?.length
    ? process.loadingSheet.items
    : [{ lrNumber: lr.lrNumber, lrDate: formatLrDate(lr.lrDate), customer: lr.customerName || lr.consignor, consignee: lr.consignee, destination: lr.to, ...parsePackagesWeight(lr.quantity) }]
  return items.map((i) => ({
    lrNumber: i.lrNumber,
    lrDate: i.lrDate || formatLrDate(lr.lrDate),
    customer: i.customerName || lr.customerName || lr.consignor,
    consignee: i.consignee || lr.consignee,
    destination: i.destination || lr.to,
    packages: i.packages ?? parsePackagesWeight(lr.quantity).packages,
    actualWeight: i.actualWeight ?? parsePackagesWeight(lr.quantity).weight,
    chargedWeight: i.chargedWeight ?? parsePackagesWeight(lr.quantity).weight,
  }))
}

function LoadingSlipForm({ lrNumber, lr, process, saving, runSave, onBack }) {
  const navigate = useNavigate()
  const sheet = process?.loadingSheet
  const [form, setForm] = useState({
    slipNo: sheet?.sheetNumber || '—',
    loadingLocation: sheet?.loadingLocation || lr.from || '',
    loadingStatus: sheet?.loadingStatus || 'Completed',
    sealNo: sheet?.sealNumber || '',
    remarks: sheet?.remarks || '',
    loader: sheet?.loaderName || '',
    supervisor: sheet?.supervisorName || '',
  })
  const [rows, setRows] = useState(() => mapLrRows(process, lr))
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    setRows(mapLrRows(process, lr))
    if (process?.loadingSheet) {
      setForm({
        slipNo: process.loadingSheet.sheetNumber || '—',
        loadingLocation: process.loadingSheet.loadingLocation || lr.from || '',
        loadingStatus: process.loadingSheet.loadingStatus || 'Completed',
        sealNo: process.loadingSheet.sealNumber || '',
        remarks: process.loadingSheet.remarks || '',
        loader: process.loadingSheet.loaderName || '',
        supervisor: process.loadingSheet.supervisorName || '',
      })
    }
  }, [process, lr])

  const totals = useMemo(() => ({
    packages: rows.reduce((s, r) => s + Number(r.packages || 0), 0),
    actualWeight: rows.reduce((s, r) => s + parseFloat(r.actualWeight || 0), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + parseFloat(r.chargedWeight || 0), 0).toFixed(3),
  }), [rows])

  const handleSave = () => runSave('Loading slip saved', () =>
    lrProcessApi.saveLoadingSheet(lrNumber, {
      loadingLocation: form.loadingLocation,
      materialQuantity: lr.quantity,
      loadingStatus: form.loadingStatus,
      remarks: form.remarks,
      businessType: process.businessType || lr.businessType,
      lrNumbers: rows.map((r) => r.lrNumber),
      vehicleNumber: lr.vehicle,
      loaderName: form.loader,
      supervisorName: form.supervisor,
      sealNumber: form.sealNo,
      loadingAt: new Date().toISOString(),
    }))

  return (
    <ERPContentPage module="Operations" title="Loading Slip" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader
          title="Loading Slip"
          breadcrumb={`Home / Loading Slip / ${lrNumber}`}
          status={lr.status}
          actions={<Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back to list</Button>}
        />

        <OpsGrid cols={4}>
          <Input label="Loading Slip No." value={form.slipNo} readOnly />
          <Input label="LR No." value={lrNumber} readOnly />
          <Input label="Branch" value={lr.branchName || '—'} readOnly />
          <Input label="Status" value={lr.status} readOnly />
        </OpsGrid>

        <div className="grid shrink-0 gap-1 lg:grid-cols-4">
          <OpsSection title="Vehicle Details" icon={Truck}>
            <OpsGrid cols={2}>
              <Input label="Vehicle No." value={lr.vehicle || '—'} readOnly />
              <Input label="Driver" value={lr.driver || '—'} readOnly />
              <Input label="From" value={lr.from || '—'} readOnly />
              <Input label="To" value={lr.to || '—'} readOnly />
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
          <OpsSection title="Loading Details" icon={MapPin}>
            <OpsGrid cols={2}>
              <Input label="Loading Location" value={form.loadingLocation} onChange={(e) => u('loadingLocation', e.target.value)} />
              <Select label="Loading Status" options={['Pending', 'In Progress', 'Completed']} value={form.loadingStatus} onChange={(e) => u('loadingStatus', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Loader / Supervisor" icon={User}>
            <OpsGrid cols={2}>
              <Input label="Loader" value={form.loader} onChange={(e) => u('loader', e.target.value)} />
              <Input label="Supervisor" value={form.supervisor} onChange={(e) => u('supervisor', e.target.value)} />
              <Input label="Seal No." className="sm:col-span-2" value={form.sealNo} onChange={(e) => u('sealNo', e.target.value)} />
            </OpsGrid>
          </OpsSection>
        </div>

        <OpsSection title="LR Details to be Loaded" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <OpsLrTable rows={rows} totals={totals} />
        </OpsSection>

        <OpsGrid cols={2}>
          <Textarea label="Loading Notes" rows={2} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
          <OpsStatusPanel status={form.loadingStatus} rows={[
            { label: 'Customer', value: lr.customerName || lr.consignor || '—' },
            { label: 'Consignee', value: lr.consignee || '—' },
          ]} />
        </OpsGrid>

        <OpsFooter
          saving={saving}
          onCancel={() => navigate('/lr?status=loading-pending')}
          onSave={handleSave}
          onSavePrint={handleSave}
        />
      </div>
    </ERPContentPage>
  )
}

export default function LoadingSlipPage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Loading Slip"
      stage="loading-pending"
      processStep="loading"
      basePath="/operations/loading-slip"
      queueHint="Select an LR pending loading to create or update a loading slip (CRUD)."
    >
      {(ctx) => <LoadingSlipForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
