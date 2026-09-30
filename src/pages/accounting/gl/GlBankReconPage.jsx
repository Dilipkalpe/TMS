import { useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import { accountingApi, glApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { Plus, Loader2, Save } from 'lucide-react'

export default function GlBankReconPage() {
  const { toast } = useToast()
  const [banks, setBanks] = useState([])
  const [ledgers, setLedgers] = useState([])
  const [form, setForm] = useState({ bankName: '', accountNo: '', ifsc: '', ledgerAccountId: '' })
  const [recon, setRecon] = useState({ bankAccountId: '', statementDate: new Date().toISOString().slice(0, 10), statementBalance: '' })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [b, lm] = await Promise.all([glApi.bankAccounts(), accountingApi.ledgerMaster({ pageSize: 200, type: 'Asset' })])
    setBanks(b || [])
    setLedgers((lm?.items || lm || []).filter((l) => /bank/i.test(l.name || '')))
  }
  useEffect(() => { load().catch(() => {}) }, [])

  const createBank = async () => {
    setSaving(true)
    try {
      await glApi.createBankAccount(form)
      toast({ title: 'Bank account linked', type: 'success' })
      setForm({ bankName: '', accountNo: '', ifsc: '', ledgerAccountId: '' })
      await load()
    } catch (err) { toast({ title: 'Failed', message: err.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  const createRecon = async () => {
    setSaving(true)
    try {
      const res = await glApi.createBankRecon({
        ...recon,
        statementBalance: Number(recon.statementBalance) || 0,
      })
      setResult(res)
      toast({ title: 'Reconciliation created', type: 'success' })
    } catch (err) { toast({ title: 'Failed', message: err.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <ERPContentPage module="Accounting" title="Bank Accounts & Reconciliation">
      <Card>
        <CardHeader title="Link Bank Account" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Bank Name" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
          <Input label="Account No" value={form.accountNo} onChange={(e) => setForm((f) => ({ ...f, accountNo: e.target.value }))} />
          <Input label="IFSC" value={form.ifsc} onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))} />
          <Select
            label="GL Ledger"
            options={[{ value: '', label: 'Select…' }, ...ledgers.map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))]}
            value={form.ledgerAccountId}
            onChange={(e) => setForm((f) => ({ ...f, ledgerAccountId: e.target.value }))}
          />
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={createBank}>Add Bank Account</Button>
        <ul className="mt-3 text-sm text-slate-600">
          {banks.map((b) => <li key={b.id}>{b.bankName} · {b.accountNo || '—'} · Ledger {b.ledgerAccountId}</li>)}
        </ul>
      </Card>
      <Card className="mt-4">
        <CardHeader title="Create Reconciliation" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Bank Account"
            options={[{ value: '', label: 'Select…' }, ...banks.map((b) => ({ value: b.id, label: b.bankName }))]}
            value={recon.bankAccountId}
            onChange={(e) => setRecon((r) => ({ ...r, bankAccountId: e.target.value }))}
          />
          <Input label="Statement Date" type="date" value={recon.statementDate} onChange={(e) => setRecon((r) => ({ ...r, statementDate: e.target.value }))} />
          <Input label="Statement Balance" type="number" value={recon.statementBalance} onChange={(e) => setRecon((r) => ({ ...r, statementBalance: e.target.value }))} />
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Save} disabled={saving} onClick={createRecon}>Reconcile</Button>
        {result && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
            <div>Statement: <strong>{formatCurrency(result.statementBalance)}</strong></div>
            <div>Book: <strong>{formatCurrency(result.bookBalance)}</strong></div>
            <div>Difference: <strong>{formatCurrency(result.difference)}</strong></div>
          </div>
        )}
      </Card>
    </ERPContentPage>
  )
}
