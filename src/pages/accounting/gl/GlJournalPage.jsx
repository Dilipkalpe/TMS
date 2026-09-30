import { useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { accountingApi, glApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { Plus, Save, Loader2, Undo2 } from 'lucide-react'

export default function GlJournalPage() {
  const { toast } = useToast()
  const [ledgers, setLedgers] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    transactionDate: new Date().toISOString().slice(0, 10),
    narration: '',
    referenceNo: '',
    asDraft: false,
    lines: [
      { ledgerAccountId: '', debit: '', credit: '' },
      { ledgerAccountId: '', debit: '', credit: '' },
    ],
  })

  const load = async () => {
    try {
      const [lm, vs] = await Promise.all([
        accountingApi.ledgerMaster({ pageSize: 500 }),
        glApi.vouchers({}),
      ])
      setLedgers(lm?.items || lm || [])
      setVouchers(vs || [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    }
  }

  useEffect(() => { load() }, [])

  const setLine = (i, k, v) => setForm((f) => {
    const lines = [...f.lines]
    lines[i] = { ...lines[i], [k]: v }
    return { ...f, lines }
  })

  const handleSave = async () => {
    const lines = form.lines
      .filter((l) => l.ledgerAccountId && (Number(l.debit) || Number(l.credit)))
      .map((l) => ({
        ledgerAccountId: l.ledgerAccountId,
        ledgerName: ledgers.find((x) => x.id === l.ledgerAccountId)?.name || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))
    setSaving(true)
    try {
      const res = await glApi.createJournal({
        voucherType: 'Journal',
        transactionDate: form.transactionDate,
        narration: form.narration,
        referenceNo: form.referenceNo,
        asDraft: form.asDraft,
        lines,
      })
      toast({ title: 'Journal saved', message: `${res.voucherNo} · ${res.status}`, type: 'success' })
      await load()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher' },
    { key: 'voucherType', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'partyName', label: 'Party' },
    { key: 'totalAmount', label: 'Amount', render: (r) => formatCurrency(r.totalAmount) },
    {
      key: 'actions',
      label: '',
      render: (r) => r.status === 'POSTED' ? (
        <Button size="sm" variant="outline" icon={Undo2} onClick={async () => {
          try {
            await glApi.reverseVoucher(r.id, 'Reversed from UI')
            toast({ title: 'Reversed', type: 'success' })
            await load()
          } catch (err) { toast({ title: 'Failed', message: err.message, type: 'error' }) }
        }}>Reverse</Button>
      ) : r.status === 'DRAFT' ? (
        <Button size="sm" onClick={async () => {
          try {
            await glApi.postDraft(r.id)
            toast({ title: 'Posted', type: 'success' })
            await load()
          } catch (err) { toast({ title: 'Failed', message: err.message, type: 'error' }) }
        }}>Post</Button>
      ) : null,
    },
  ]

  const ledgerOpts = ledgers.map((l) => ({ value: l.id || '', label: `${l.code} — ${l.name}` })).filter((o) => o.value)

  return (
    <ERPContentPage module="Accounting" title="Journal Voucher (GL)">
      <Card>
        <CardHeader title="New Journal" subtitle="Debit must equal Credit. Posted vouchers cannot be edited — reverse instead." />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Date" type="date" value={form.transactionDate} onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))} />
          <Input label="Reference" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
          <Input label="Narration" value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} />
        </div>
        <div className="mt-3 space-y-2">
          {form.lines.map((line, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <Select label={`Ledger ${i + 1}`} options={[{ value: '', label: 'Select…' }, ...ledgerOpts]} value={line.ledgerAccountId} onChange={(e) => setLine(i, 'ledgerAccountId', e.target.value)} />
              <Input label="Debit" type="number" value={line.debit} onChange={(e) => setLine(i, 'debit', e.target.value)} />
              <Input label="Credit" type="number" value={line.credit} onChange={(e) => setLine(i, 'credit', e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" icon={Plus} onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, { ledgerAccountId: '', debit: '', credit: '' }] }))}>Add Line</Button>
          <Select
            label="Save as"
            options={[{ value: 'false', label: 'Posted' }, { value: 'true', label: 'Draft' }]}
            value={form.asDraft ? 'true' : 'false'}
            onChange={(e) => setForm((f) => ({ ...f, asDraft: e.target.value === 'true' }))}
          />
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Journal'}</Button>
        </div>
      </Card>
      <Card className="mt-4" padding={false}>
        <CardHeader className="px-4 pt-4" title="Recent Vouchers" />
        <ERPDataTable columns={columns} data={vouchers} showActions={false} selectable={false} />
      </Card>
    </ERPContentPage>
  )
}
