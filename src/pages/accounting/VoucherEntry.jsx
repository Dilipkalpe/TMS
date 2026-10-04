import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import { accountingApi, glApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

function VoucherForm({ type, ledgers, onSave, initial, readOnlyType }) {
  const [form, setForm] = useState({
    voucherNo: '',
    date: new Date().toISOString().slice(0, 10),
    referenceNo: '',
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

  useEffect(() => {
    if (!initial) return
    setForm({
      voucherNo: initial.voucherNo || '',
      date: initial.date || initial.voucherDate || new Date().toISOString().slice(0, 10),
      referenceNo: initial.referenceNo || '',
      debitLedgerId: initial.debitLedgerId || '',
      creditLedgerId: initial.creditLedgerId || '',
      amount: initial.amount != null ? String(initial.amount) : '',
      narration: initial.narration || '',
    })
  }, [initial])

  const handleSave = async () => {
    const amount = Number(form.amount)
    if (!form.debitLedgerId || !form.creditLedgerId || !amount) {
      toast({ title: 'Validation', message: 'Debit ledger, credit ledger and amount are required.', type: 'warning' })
      return
    }
    if (form.debitLedgerId === form.creditLedgerId) {
      toast({ title: 'Validation', message: 'Debit and credit ledgers must be different.', type: 'warning' })
      return
    }
    const debitAcc = ledgers.find((l) => l.id === form.debitLedgerId)
    const creditAcc = ledgers.find((l) => l.id === form.creditLedgerId)
    const debitType = (debitAcc?.accountType || debitAcc?.type || '').toLowerCase()
    const creditType = (creditAcc?.accountType || creditAcc?.type || '').toLowerCase()
    if (type === 'Receipt' && debitType === 'income') {
      toast({ title: 'Validation', message: 'Receipt: Income cannot be Debit. Debit Cash/Bank, Credit Income/Receivable.', type: 'warning' })
      return
    }
    if (type === 'Payment' && creditType === 'expense') {
      toast({ title: 'Validation', message: 'Payment: Expense cannot be Credit. Debit Expense, Credit Cash/Bank.', type: 'warning' })
      return
    }
    if (amount <= 0) {
      toast({ title: 'Validation', message: 'Amount must be greater than zero. Total Debit must equal Total Credit.', type: 'warning' })
      return
    }
    // Balanced by construction (same amount on debit and credit)
    const totalDebit = amount
    const totalCredit = amount
    if (totalDebit !== totalCredit) {
      toast({ title: 'Validation', message: `Unbalanced voucher: Debit ${totalDebit} != Credit ${totalCredit}.`, type: 'warning' })
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
        referenceNo: form.referenceNo || undefined,
        amount,
        narration: form.narration,
        debitLedgerId: form.debitLedgerId,
        creditLedgerId: form.creditLedgerId,
        debitLedger: debit?.name || '',
        creditLedger: credit?.name || '',
      })
      toast({ title: 'Saved', message: `${type} saved successfully.`, type: 'success' })
      if (!initial) {
        setForm({
          voucherNo: '',
          date: new Date().toISOString().slice(0, 10),
          referenceNo: '',
          debitLedgerId: '',
          creditLedgerId: '',
          amount: '',
          narration: '',
        })
      }
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input
        label="Voucher Number"
        value={form.voucherNo}
        placeholder="Auto-generated if empty"
        disabled={!!initial}
        onChange={(e) => setForm((f) => ({ ...f, voucherNo: e.target.value }))}
      />
      <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
      <Input label="Reference No." value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
      {readOnlyType && (
        <Input label="Voucher Type" value={type} disabled />
      )}
      <Select label="Debit Ledger" options={ledgerOpts} value={form.debitLedgerId} onChange={(e) => setForm((f) => ({ ...f, debitLedgerId: e.target.value }))} />
      <Select label="Credit Ledger" options={ledgerOpts} value={form.creditLedgerId} onChange={(e) => setForm((f) => ({ ...f, creditLedgerId: e.target.value }))} />
      <Input label="Amount (₹)" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
      <div className="sm:col-span-2 lg:col-span-3 text-xs text-slate-500">
        Total Debit and Total Credit will both equal the amount above (must balance).
        {type === 'Receipt' && ' Receipt tip: Debit Cash/Bank · Credit Income or Receivable.'}
        {type === 'Payment' && ' Payment tip: Debit Expense · Credit Cash/Bank.'}
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Textarea label="Narration" placeholder="Enter narration..." value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update Voucher' : `Save ${type}`}
        </Button>
      </div>
    </div>
  )
}

function mapVoucherToForm(v) {
  const lines = [...(v.lines || [])].sort((a, b) => (a.lineNo || 0) - (b.lineNo || 0))
  const debit = lines.find((l) => Number(l.debit) > 0) || lines[0]
  const credit = lines.find((l) => Number(l.credit) > 0) || lines[1]
  const amount = Number(debit?.debit || credit?.credit || v.totalAmount || 0)
  return {
    voucherNo: v.voucherNo,
    date: v.date || v.voucherDate,
    referenceNo: v.referenceNo || '',
    debitLedgerId: debit?.ledgerAccountId || '',
    creditLedgerId: credit?.ledgerAccountId || '',
    amount,
    narration: v.narration || '',
    voucherType: v.voucherType,
    status: v.status,
  }
}

export default function VoucherEntry() {
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const navigate = useNavigate()
  const { toast } = useToast()
  const [voucherTypes, setVoucherTypes] = useState([])
  const [ledgers, setLedgers] = useState([])
  const [editInitial, setEditInitial] = useState(null)
  const [editType, setEditType] = useState(null)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)

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

  useEffect(() => {
    if (!editId) {
      setEditInitial(null)
      setEditType(null)
      setLoadingEdit(false)
      return
    }
    setLoadingEdit(true)
    glApi.voucher(editId)
      .then((v) => {
        if (v.status === 'REVERSED') {
          toast({ title: 'Cannot edit', message: 'Reversed vouchers cannot be edited.', type: 'warning' })
          navigate('/accounting/vouchers')
          return
        }
        const mapped = mapVoucherToForm(v)
        setEditInitial(mapped)
        const fullType = v.voucherType?.includes('Voucher')
          ? v.voucherType
          : `${v.voucherType || 'Journal'} Voucher`
        setEditType(fullType)
      })
      .catch((err) => {
        toast({ title: 'Load failed', message: err.message, type: 'error' })
        navigate('/accounting/vouchers')
      })
      .finally(() => setLoadingEdit(false))
  }, [editId, navigate, toast])

  const handleCreate = accountingApi.createVoucher

  const handleUpdate = async (payload) => {
    const res = await glApi.updateVoucher(editId, payload)
    navigate(`/accounting/vouchers/${res?.id || editId}`)
  }

  if (editId) {
    return (
      <ERPContentPage module="Accounting" title="Edit Voucher">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(`/accounting/vouchers/${editId}`)}>Back</Button>
          <Link to="/accounting/vouchers"><Button variant="outline">Voucher List</Button></Link>
        </div>
        <Card className="!p-2.5 sm:!p-3">
          <CardHeader title="Edit Voucher" subtitle={editInitial?.status === 'POSTED' ? 'Posted voucher: update corrects GL via reverse+repost (engine) or in-place (legacy).' : 'Draft voucher: update in place.'} />
          {loadingEdit || !editInitial ? (
            <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            <VoucherForm
              type={editType || editInitial.voucherType}
              ledgers={ledgers}
              initial={editInitial}
              readOnlyType
              onSave={handleUpdate}
            />
          )}
        </Card>
      </ERPContentPage>
    )
  }

  const tabs = voucherTypes.map((type) => ({
    id: type,
    label: type.replace(' Voucher', ''),
    content: <VoucherForm type={type} ledgers={ledgers} onSave={handleCreate} />,
  }))

  return (
    <ERPContentPage module="Accounting" title="Voucher Entry">
      <div className="mb-3">
        <Link to="/accounting/vouchers">
          <Button variant="outline">Voucher List</Button>
        </Link>
      </div>
      <Card className="!p-2.5 sm:!p-3">
        <CardHeader title="Create Voucher" />
        {tabs.length ? <Tabs tabs={tabs} /> : <p className="text-sm text-slate-500">Loading…</p>}
      </Card>
    </ERPContentPage>
  )
}
