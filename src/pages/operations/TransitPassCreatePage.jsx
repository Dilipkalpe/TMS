import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import { OpsFooter, OpsGrid, OpsLrTable, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { FileBadge, Truck, Route, ArrowLeft } from 'lucide-react'
import { lrProcessApi } from '../../services/api'
import { formatLrDate, parsePackagesWeight } from '../../utils/lrDisplayHelpers'
import { usePrint } from '../../context/PrintContext'
import TransitPassPrintFormat from '../../components/print/TransitPassPrintFormat'

function TransitPassForm({ lrNumber, lr, process, saving, runSave, onBack }) {
  const navigate = useNavigate()
  const { company, print } = usePrint()
  const pass = process?.transitPass
  const [form, setForm] = useState({
    passNo: pass?.passNumber || '—',
    via: pass?.viaPoints || `${lr.from} - ${lr.to}`,
    sealNo: pass?.sealNumber || '',
    sealCondition: pass?.sealCondition || 'Intact',
    transitType: pass?.transitType || 'By Road',
    remarks: pass?.remarks || '',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (pass) {
      setForm({
        passNo: pass.passNumber || '—',
        via: pass.viaPoints || `${lr.from} - ${lr.to}`,
        sealNo: pass.sealNumber || '',
        sealCondition: pass.sealCondition || 'Intact',
        transitType: pass.transitType || 'By Road',
        remarks: pass.remarks || '',
      })
    }
  }, [pass, lr])

  const rows = useMemo(() => {
    const items = process?.loadingSheet?.items?.length ? process.loadingSheet.items : [{ lrNumber: lr.lrNumber }]
    return items.map((i) => {
      const pkg = parsePackagesWeight(lr.quantity)
      return {
        lrNumber: i.lrNumber || lr.lrNumber,
        lrDate: formatLrDate(lr.lrDate),
        customer: lr.customerName || lr.consignor,
        consignee: lr.consignee,
        destination: lr.to,
        packages: pkg.packages,
        actualWeight: pkg.weight,
        chargedWeight: pkg.weight,
      }
    })
  }, [process, lr])

  const totals = useMemo(() => ({
    packages: rows.reduce((s, r) => s + Number(r.packages || 0), 0),
    actualWeight: rows.reduce((s, r) => s + parseFloat(r.actualWeight || 0), 0).toFixed(3),
    chargedWeight: rows.reduce((s, r) => s + parseFloat(r.chargedWeight || 0), 0).toFixed(3),
  }), [rows])

  const handleSave = () => runSave(pass ? 'Transit pass updated' : 'Transit pass generated', () =>
    lrProcessApi.createTransitPass(lrNumber, {
      viaPoints: form.via,
      sealNumber: form.sealNo,
      sealCondition: form.sealCondition,
      transitType: form.transitType,
      remarks: form.remarks,
    }))

  const handlePrint = () => {
    if (!process?.transitPass) return
    print(<TransitPassPrintFormat pass={process.transitPass} lr={lr} company={company} loadingItems={process.loadingSheet?.items} />)
  }

  return (
    <ERPContentPage module="Operations" title="Transit Pass" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader
          title="Transit Pass"
          breadcrumb={`Home / Transit Pass / ${lrNumber}`}
          status={lr.status}
          actions={
            <>
              <Button size="sm" variant="outline" icon={ArrowLeft} onClick={onBack}>Back to list</Button>
              {pass && <Button size="sm" variant="outline" onClick={handlePrint}>Print</Button>}
            </>
          }
        />

        <div className="grid shrink-0 gap-1 lg:grid-cols-[1fr_11rem]">
          <OpsSection title="Transit Pass Details" icon={FileBadge}>
            <OpsGrid cols={4}>
              <Input label="Pass No." value={form.passNo} readOnly />
              <Input label="LR No." value={lrNumber} readOnly />
              <Input label="From" value={lr.from || '—'} readOnly />
              <Input label="To" value={lr.to || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsStatusPanel status={lr.status} rows={[
            { label: 'Vehicle', value: lr.vehicle || '—' },
            { label: 'Driver', value: lr.driver || '—' },
          ]} />
        </div>

        <OpsGrid cols={2}>
          <OpsSection title="Vehicle & Driver" icon={Truck}>
            <OpsGrid cols={2}>
              <Input label="Vehicle No." value={lr.vehicle || '—'} readOnly />
              <Input label="Driver" value={lr.driver || '—'} readOnly />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Trip Details">
            <OpsGrid cols={3}>
              <Input label="LR Count" readOnly value={String(rows.length)} />
              <Input label="Total Pkgs" readOnly value={String(totals.packages)} />
              <Input label="Chg. Weight" readOnly value={totals.chargedWeight} />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <OpsSection title="Route & Schedule" icon={Route}>
          <OpsGrid cols={4}>
            <Input label="Via / Route" value={form.via} onChange={(e) => u('via', e.target.value)} />
            <Input label="Seal No." value={form.sealNo} onChange={(e) => u('sealNo', e.target.value)} />
            <Select label="Seal Condition" options={['Intact', 'Broken', 'Missing']} value={form.sealCondition} onChange={(e) => u('sealCondition', e.target.value)} />
            <Select label="Transit Type" options={['By Road', 'By Rail', 'Multimodal']} value={form.transitType} onChange={(e) => u('transitType', e.target.value)} />
          </OpsGrid>
        </OpsSection>

        <OpsSection title="LR Details (All LRs in this Transit)" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <OpsLrTable rows={rows} totals={totals} />
        </OpsSection>

        <Textarea label="Remarks" rows={2} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />

        <OpsFooter saving={saving} onCancel={() => navigate('/lr?status=vehicle-assigned')} onSave={handleSave} onSavePrint={() => { handleSave(); handlePrint() }} />
      </div>
    </ERPContentPage>
  )
}

export default function TransitPassCreatePage() {
  return (
    <OpsLrQueueGate
      module="Operations"
      title="Transit Pass"
      stage="vehicle-assigned"
      processStep="transit"
      basePath="/operations/transit-pass"
      queueHint="Select an LR with vehicle assigned to generate or update a transit pass (CRUD)."
    >
      {(ctx) => <TransitPassForm {...ctx} />}
    </OpsLrQueueGate>
  )
}
