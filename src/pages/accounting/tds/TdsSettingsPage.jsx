import { useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import { tdsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { Save, Loader2 } from 'lucide-react'

export default function TdsSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    enabled: true,
    tdsPayableLedgerName: 'TDS Payable',
    tdsReceivableLedgerName: 'TDS Receivable',
    roundOff: 'NEAREST',
    autoPostVoucher: true,
  })

  useEffect(() => {
    tdsApi.settings()
      .then((s) => setForm({
        enabled: !!s.enabled,
        tdsPayableLedgerName: s.tdsPayableLedgerName || 'TDS Payable',
        tdsReceivableLedgerName: s.tdsReceivableLedgerName || 'TDS Receivable',
        roundOff: s.roundOff || 'NEAREST',
        autoPostVoucher: !!s.autoPostVoucher,
      }))
      .catch((err) => toast({ title: 'Load failed', message: err.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const s = await tdsApi.updateSettings(form)
      setForm({
        enabled: !!s.enabled,
        tdsPayableLedgerName: s.tdsPayableLedgerName,
        tdsReceivableLedgerName: s.tdsReceivableLedgerName,
        roundOff: s.roundOff,
        autoPostVoucher: !!s.autoPostVoucher,
      })
      toast({ title: 'TDS settings saved', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Accounting" title="TDS Settings">
      <Card>
        <CardHeader title="Module configuration" subtitle="Enable TDS and map payable / receivable ledgers" />
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Module Enabled"
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
              value={form.enabled ? 'true' : 'false'}
              onChange={(e) => u('enabled', e.target.value === 'true')}
            />
            <Select
              label="Round Off"
              options={['NEAREST', 'UP', 'DOWN', 'NONE']}
              value={form.roundOff}
              onChange={(e) => u('roundOff', e.target.value)}
            />
            <Input
              label="TDS Payable Ledger"
              value={form.tdsPayableLedgerName}
              onChange={(e) => u('tdsPayableLedgerName', e.target.value)}
            />
            <Input
              label="TDS Receivable Ledger"
              value={form.tdsReceivableLedgerName}
              onChange={(e) => u('tdsReceivableLedgerName', e.target.value)}
            />
            <Select
              label="Auto-post Voucher"
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
              value={form.autoPostVoucher ? 'true' : 'false'}
              onChange={(e) => u('autoPostVoucher', e.target.value === 'true')}
            />
          </div>
        )}
        <Button className="mt-4" icon={saving ? Loader2 : Save} disabled={saving || loading} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </Card>
    </ERPContentPage>
  )
}
