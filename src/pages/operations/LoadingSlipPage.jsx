import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsLrTable, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import {
  LOADING_CHECKLIST, OpsAttachments, OpsChecklist, OpsSignaturePad, useOpsExtended,
} from '../../components/ops/OpsPhase2Parts'
import { ClipboardList, Truck, MapPin, User, ArrowLeft, Plus } from 'lucide-react'
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

function LoadingSlipForm({ lrNumber, lr, process, saving, runSave, reload, onBack }) {
  const navigate = useNavigate()
  const sheet = process?.loadingSheet
  const ext = sheet?.extendedData || {}
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
  const [extended, mergeExt] = useOpsExtended({
    checklist: ext.checklist || {},
    signatures: ext.signatures || {},
  })
  const [addLr, setAddLr] = useState('')
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    setRows(mapLrRows(process, lr))
    const s = process?.loadingSheet
    if (s) {
      setForm({
        slipNo: s.sheetNumber || '—',
        loadingLocation: s.loadingLocation || lr.from || '',
        loadingStatus: s.loadingStatus || 'Completed',
        sealNo: s.sealNumber || '',
        remarks: s.remarks || '',
        loader: s.loaderName || '',
        supervisor: s.supervisorName || '',
      })
      mergeExt({
        checklist: s.extendedData?.checklist || {},
        signatures: s.extendedData?.signatures || {},
      })
    }
  }, [process, lr]) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => ({
    packages: rows.reduce((s, r) => s + Number(r.packages || 0), 0),
    actualWeight: rows.reduce((s, r) => s + parseFloat(r.actualWeight || 0), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + parseFloat(r.chargedWeight || 0), 0).toFixed(3),
  }), [rows])

  const addRow = () => {
    const num = addLr.trim()
    if (!num || rows.some((r) => r.lrNumber === num)) return
    setRows([...rows, { lrNumber: num, lrDate: '—', customer: '—', consignee: '—', destination: '—', packages: 0, actualWeight: 0, chargedWeight: 0 }])
    setAddLr('')
  }

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
      extendedData: { checklist: extended.checklist, signatures: extended.signatures },
    }))

  const docs = process?.deliveryDocuments || []

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

        <OpsSection title="LR Details to be Loaded" className="flex min-h-0 flex-1 flex-col overflow-hidden"
          action={
            <div className="flex items-center gap-1">
              <Input className="!py-0.5" placeholder="Add LR No." value={addLr} onChange={(e) => setAddLr(e.target.value)} />
              <Button size="sm" icon={Plus} onClick={addRow}>Add</Button>
            </div>
          }>
          <OpsLrTable rows={rows} totals={totals} />
        </OpsSection>

        <OpsGrid cols={3}>
          <OpsSection title="Loading Checklist">
            <OpsChecklist items={LOADING_CHECKLIST} values={extended.checklist} onChange={(v) => mergeExt({ checklist: v })} />
          </OpsSection>
          <OpsSection title="Signatures">
            <div className="grid gap-1 sm:grid-cols-2">
              <OpsSignaturePad label="Loader Signature" value={extended.signatures?.loader} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, loader: v } })} />
              <OpsSignaturePad label="Supervisor Signature" value={extended.signatures?.supervisor} onChange={(v) => mergeExt({ signatures: { ...extended.signatures, supervisor: v } })} />
            </div>
          </OpsSection>
          <OpsSection title="Attachments">
            <OpsAttachments lrNumber={lrNumber} documents={docs.filter((d) => d.docType?.includes('Loading'))} docType="Loading Document" uploadFn={lrProcessApi.uploadDeliveryDocument} onUploaded={reload} />
          </OpsSection>
        </OpsGrid>

        <OpsGrid cols={2}>
          <Textarea label="Loading Notes" rows={2} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
          <OpsStatusPanel status={form.loadingStatus} rows={[
            { label: 'Customer', value: lr.customerName || lr.consignor || '—' },
            { label: 'Consignee', value: lr.consignee || '—' },
          ]} />
        </OpsGrid>

        <OpsFooter saving={saving} onCancel={() => navigate('/lr?status=loading-pending')} onSave={handleSave} onSavePrint={handleSave} />
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
