import { useEffect, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import { accountingApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Save, Loader2 } from 'lucide-react'

function VoucherForm({ type, ledgers, onSave }) {
  const [form, setForm] = useState({
    voucherNo: '',
    date: new Date().toISOString().slice(0, 10),
    debitLedgerId: '',
    creditLedgerId: '',
    amount: '',
    narration: '',
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const ledgerOpts = [
    { value: '', label: 'Select Ledger' },
    ...ledgers.map((m) => ({ value: m.id || '', label: m.code ? `${m.code} — ${m.name}` : m.name })).filter((o) => o.value),
  ]

  const handleSave = async () => {
    if (!form.debitLedgerId || !form.creditLedgerId || !Number(form.amount)) {
      toast({ title: 'Validation', message: 'Debit ledger, credit ledger and amount are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const debit = ledgers.find((l) => l.id === form.debitLedgerId)
      const credit = ledgers.find((l) => l.id === form.creditLedgerId)
      await onSave({
        voucherType: type,
        voucherNo: form.voucherNo || undefined,
        date: form.date,
        amount: Number(form.amount),
        narration: form.narration,
        debitLedgerId: form.debitLedgerId,
        creditLedgerId: form.creditLedgerId,
        debitLedger: debit?.name || '',
        creditLedger: credit?.name || '',
      })
      toast({ title: 'Saved', message: `${type} saved successfully.`, type: 'success' })
      setForm({
        voucherNo: '',
        date: new Date().toISOString().slice(0, 10),
        debitLedgerId: '',
        creditLedgerId: '',
        amount: '',
        narration: '',
      })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input label="Voucher Number" value={form.voucherNo} placeholder="Auto-generated if empty" onChange={(e) => setForm((f) => ({ ...f, voucherNo: e.target.value }))} />
      <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
      <Select label="Debit Ledger" options={ledgerOpts} value={form.debitLedgerId} onChange={(e) => setForm((f) => ({ ...f, debitLedgerId: e.target.value }))} />
      <Select label="Credit Ledger" options={ledgerOpts} value={form.creditLedgerId} onChange={(e) => setForm((f) => ({ ...f, creditLedgerId: e.target.value }))} />
      <Input label="Amount (₹)" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
      <div className="sm:col-span-2 lg:col-span-3">
        <Textarea label="Narration" placeholder="Enter narration..." value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : `Save ${type}`}
        </Button>
      </div>
    </div>
  )
}

export default function VoucherEntry() {
  const [voucherTypes, setVoucherTypes] = useState([])
  const [ledgers, setLedgers] = useState([])

  useEffect(() => {
    Promise.all([accountingApi.voucherTypes(), accountingApi.ledgerMaster({ pageSize: 500 })])
      .then(([types, masters]) => {
        setVoucherTypes(types)
        setLedgers(masters?.items || masters || [])
      })
      .catch(() => {
        setVoucherTypes(['Payment Voucher', 'Receipt Voucher', 'Journal Voucher', 'Contra Voucher'])
      })
  }, [])

  const tabs = voucherTypes.map((type) => ({
    id: type,
    label: type.replace(' Voucher', ''),
    content: <VoucherForm type={type} ledgers={ledgers} onSave={accountingApi.createVoucher} />,
  }))

  return (
    <ERPContentPage module="Accounting" title="Voucher Entry">
      <Card className="!p-2.5 sm:!p-3">
        <CardHeader title="Create Voucher" />
        {tabs.length ? <Tabs tabs={tabs} /> : <p className="text-sm text-slate-500">Loading…</p>}
      </Card>
    </ERPContentPage>
  )
}
