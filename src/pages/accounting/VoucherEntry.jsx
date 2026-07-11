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
    debitLedger: '',
    creditLedger: '',
    amount: '',
    narration: '',
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const ledgerOptions = ['Select Ledger', ...ledgers]

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ ...form, voucherType: type })
      toast({ title: 'Saved', message: `${type} saved successfully.`, type: 'success' })
      setForm({ voucherNo: '', date: new Date().toISOString().slice(0, 10), debitLedger: '', creditLedger: '', amount: '', narration: '' })
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
      <Select label="Debit Ledger" options={ledgerOptions} value={form.debitLedger} onChange={(e) => setForm((f) => ({ ...f, debitLedger: e.target.value }))} />
      <Select label="Credit Ledger" options={ledgerOptions} value={form.creditLedger} onChange={(e) => setForm((f) => ({ ...f, creditLedger: e.target.value }))} />
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
    Promise.all([accountingApi.voucherTypes(), accountingApi.ledgerMaster()])
      .then(([types, masters]) => {
        setVoucherTypes(types)
        setLedgers(masters.map((m) => m.name))
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
