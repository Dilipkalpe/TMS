import { useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { glApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Loader2, RefreshCw, Lock, Play, Save } from 'lucide-react'

export default function GlControlsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState(null)
  const [years, setYears] = useState([])
  const [maps, setMaps] = useState([])
  const [findings, setFindings] = useState([])
  const [audit, setAudit] = useState([])
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const [s, y, m, f, a] = await Promise.all([
        glApi.settings(), glApi.financialYears(), glApi.postingMaps(),
        glApi.findings().catch(() => []), glApi.auditLog().catch(() => []),
      ])
      setSettings(s); setYears(y || []); setMaps(m || []); setFindings(f || []); setAudit(a || [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    }
  }
  useEffect(() => { load() }, [])

  const saveSettings = async () => {
    setBusy(true)
    try {
      setSettings(await glApi.updateSettings(settings))
      toast({ title: 'GL settings saved', type: 'success' })
    } catch (err) { toast({ title: 'Failed', message: err.message, type: 'error' }) }
    finally { setBusy(false) }
  }

  const runMigration = async () => {
    setBusy(true)
    try {
      const res = await glApi.runMigration()
      toast({
        title: 'Migration complete',
        message: `Inv ${res.postedInvoices} · Rcpt ${res.postedReceipts} · Exp ${res.postedExpenses} · VP ${res.postedVendorPayments}`,
        type: 'success',
      })
      await load()
    } catch (err) { toast({ title: 'Migration failed', message: err.message, type: 'error' }) }
    finally { setBusy(false) }
  }

  const runRecon = async () => {
    setBusy(true)
    try {
      const res = await glApi.runReconciliation()
      toast({ title: 'Reconciliation', message: `${res.findings} open findings`, type: 'success' })
      await load()
    } catch (err) { toast({ title: 'Failed', message: err.message, type: 'error' }) }
    finally { setBusy(false) }
  }

  if (!settings) return <ERPContentPage module="Accounting" title="GL Controls"><p className="text-sm text-slate-500">Loading…</p></ERPContentPage>

  return (
    <ERPContentPage module="Accounting" title="GL Controls & Migration">
      <Card>
        <CardHeader title="Accounting Settings" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="GL Reports Enabled" options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} value={settings.glReportsEnabled ? 'true' : 'false'} onChange={(e) => setSettings((s) => ({ ...s, glReportsEnabled: e.target.value === 'true' }))} />
          <Select label="Auto-post Ops Txns" options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} value={settings.autoPostOps ? 'true' : 'false'} onChange={(e) => setSettings((s) => ({ ...s, autoPostOps: e.target.value === 'true' }))} />
          <Select label="Require Approval" options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} value={settings.requireApproval ? 'true' : 'false'} onChange={(e) => setSettings((s) => ({ ...s, requireApproval: e.target.value === 'true' }))} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon={busy ? Loader2 : Save} disabled={busy} onClick={saveSettings}>Save Settings</Button>
          <Button variant="outline" icon={Play} disabled={busy} onClick={runMigration}>Run FY Backfill</Button>
          <Button variant="outline" icon={RefreshCw} disabled={busy} onClick={runRecon}>Run Ops↔GL Reconciliation</Button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Financial Years / Period Lock" />
        {(years || []).map((fy) => (
          <div key={fy.id} className="mb-3">
            <p className="font-semibold">FY {fy.code} ({fy.startDate} → {fy.endDate}) {fy.isClosed ? '· CLOSED' : ''}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {(fy.periods || []).map((p) => (
                <Button key={p.id} size="sm" variant={p.isLocked ? 'default' : 'outline'} icon={Lock}
                  onClick={async () => { await glApi.lockPeriod(p.id, !p.isLocked); await load() }}>
                  {p.name}{p.isLocked ? ' 🔒' : ''}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Posting Maps" subtitle="Transaction type → ledgers" />
        <ERPDataTable
          columns={[
            { key: 'txnType', label: 'Txn Type' },
            { key: 'debitLedgerId', label: 'Debit Ledger Id' },
            { key: 'creditLedgerId', label: 'Credit Ledger Id' },
            { key: 'taxLedgerId', label: 'Tax Ledger' },
            { key: 'tdsLedgerId', label: 'TDS Ledger' },
          ]}
          data={maps}
          showActions={false}
          selectable={false}
        />
      </Card>

      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Reconciliation Findings" />
        <ERPDataTable
          columns={[
            { key: 'findingType', label: 'Type' },
            { key: 'sourceType', label: 'Source' },
            { key: 'sourceId', label: 'Id' },
            { key: 'message', label: 'Message' },
          ]}
          data={findings}
          showActions={false}
          selectable={false}
        />
      </Card>

      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Audit Trail" />
        <ERPDataTable
          columns={[
            { key: 'createdAt', label: 'When' },
            { key: 'action', label: 'Action' },
            { key: 'entityType', label: 'Entity' },
            { key: 'details', label: 'Details' },
            { key: 'userName', label: 'User' },
          ]}
          data={audit}
          showActions={false}
          selectable={false}
        />
      </Card>
    </ERPContentPage>
  )
}
