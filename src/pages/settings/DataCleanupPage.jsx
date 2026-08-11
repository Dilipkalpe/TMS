import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { settingsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const CONFIRM = 'DELETE DATA'

export default function DataCleanupPage() {
  const { toast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const runPurge = async () => {
    if (confirmText.trim() !== CONFIRM) {
      toast({ title: 'Confirmation required', message: `Type ${CONFIRM} exactly.`, type: 'error' })
      return
    }
    if (!window.confirm('This permanently deletes all transaction and master data for this company. Configuration is kept. Continue?')) {
      return
    }
    setBusy(true)
    setResult(null)
    try {
      const res = await settingsApi.purgeData(CONFIRM)
      setResult(res)
      setConfirmText('')
      toast({ title: 'Data deleted', message: res.message || 'Purge completed.', type: 'success' })
    } catch (err) {
      toast({ title: 'Purge failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ERPContentPage module="Settings" title="Data cleanup">
      <div className="mb-4">
        <Link to="/settings" className="text-sm text-primary hover:underline">← Back to Settings hub</Link>
      </div>

      <Card className="mb-4 border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-slate-50">Delete transaction &amp; master data</p>
            <p>
              Removes bookings, LRs, loading slips, dispatch/delivery/POD, invoices, vouchers, expenses, trips,
              and master records (customers, vehicles, vendors, consignors, items, freight rates, drivers, etc.).
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              Large databases (hundreds of thousands of LRs) can take several minutes. Keep this tab open until it finishes.
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Kept:</strong> company settings, users &amp; roles, branches, document numbering config,
                print templates, chart of accounts, notification templates, subscription, HR departments /
                designations / leave types / holidays.
              </span>
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <Input
          label={`Type ${CONFIRM} to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM}
          autoComplete="off"
        />
        <Button
          variant="danger"
          icon={busy ? Loader2 : Trash2}
          disabled={busy || confirmText.trim() !== CONFIRM}
          onClick={runPurge}
        >
          {busy ? 'Deleting…' : 'Delete transaction & master data'}
        </Button>
      </Card>

      {result?.deleted && (
        <Card className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Deleted row counts</h3>
          <div className="grid max-h-64 gap-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(result.deleted)
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([table, n]) => (
                <div key={table} className="flex justify-between gap-2 rounded border border-slate-100 px-2 py-1 dark:border-slate-800">
                  <span className="font-mono">{table}</span>
                  <span className="font-semibold">{n}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </ERPContentPage>
  )
}
