import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, IndianRupee, Loader2 } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import Card from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiObject } from '../../hooks/useApiResource'
import { accountingApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'Cheque', 'RTGS', 'Card']

function OutstandingLinesModal({ open, onClose, title, lines }) {
  const rows = Array.isArray(lines) ? lines : []
  return (
    <Modal open={open} onClose={onClose} title={title || 'Outstanding details'} size="lg">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No line details available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 font-semibold">LNo</th>
                <th className="px-2 py-2 font-semibold">LR Date</th>
                <th className="px-2 py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((line, idx) => (
                <tr key={`${line.lrNo}-${line.lrDate}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-2 font-medium">{line.lrNo || '—'}</td>
                  <td className="px-2 py-2">{line.lrDate || '—'}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(line.amount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

function CustomerPaymentModal({ open, onClose, customer, onPaid }) {
  const { toast } = useToast()
  const lines = Array.isArray(customer?.lines) ? customer.lines.filter((l) => Number(l.amount) > 0) : []
  const [saving, setSaving] = useState(false)
  const [lineKey, setLineKey] = useState('')
  const [form, setForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Cash',
    referenceNo: '',
    remarks: '',
  })

  const selected = useMemo(() => {
    if (!lineKey) return null
    return lines.find((l, i) => `${l.sourceType}:${l.sourceId}:${i}` === lineKey) ?? null
  }, [lineKey, lines])

  useEffect(() => {
    if (!open || !customer) return
    const first = lines[0]
    setLineKey(first ? `${first.sourceType}:${first.sourceId}:0` : '')
    setForm({
      amount: first ? String(first.amount ?? '') : '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Cash',
      referenceNo: '',
      remarks: '',
    })
  }, [open, customer?.partyId, customer?.name])

  useEffect(() => {
    if (!open || !selected) return
    setForm((f) => ({ ...f, amount: String(selected.amount ?? '') }))
  }, [lineKey])

  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!selected?.sourceType || !selected?.sourceId) {
      toast({ title: 'Select a document', message: 'Choose an LNo line to pay against.', type: 'warning' })
      return
    }
    const amount = Number(form.amount)
    const max = Number(selected.amount ?? 0)
    if (!amount || amount <= 0) {
      toast({ title: 'Enter payment amount', type: 'warning' })
      return
    }
    if (amount > max + 0.001) {
      toast({ title: 'Amount exceeds line outstanding', message: `Max ${formatCurrency(max)}`, type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const res = await accountingApi.recordCustomerPayment({
        sourceType: selected.sourceType,
        sourceId: selected.sourceId,
        amount,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo || undefined,
        remarks: form.remarks || undefined,
        customerId: customer?.partyId || undefined,
      })
      toast({
        title: 'Payment recorded',
        message: `Receipt ${res.receiptNo || ''} · Remaining ${formatCurrency(res.outstanding ?? 0)}`,
        type: 'success',
      })
      onPaid?.(res)
      onClose?.()
    } catch (err) {
      toast({ title: 'Payment failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!customer) return null

  const lineOptions = lines.map((l, i) => ({
    value: `${l.sourceType}:${l.sourceId}:${i}`,
    label: `${l.lrNo || '—'} · ${l.lrDate || '—'} · ${formatCurrency(l.amount ?? 0)}`,
  }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button icon={saving ? Loader2 : IndianRupee} onClick={handleSave} disabled={saving || lines.length === 0}>
            {saving ? 'Saving…' : 'Pay Now'}
          </Button>
        </div>
      )}
    >
      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Customer</p>
          <p className="font-semibold">{customer.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Total Pending</p>
          <p className="font-semibold text-amber-600">
            {formatCurrency(customer.totalPending ?? customer.amount ?? 0)}
          </p>
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-slate-500">No payable lines available for this customer.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select
              label="Pay against (LNo) *"
              options={lineOptions}
              value={lineKey}
              onChange={(e) => setLineKey(e.target.value)}
            />
          </div>
          <Input label="Payment Amount (₹) *" type="number" value={form.amount} onChange={(e) => u('amount', e.target.value)} />
          <Input label="Payment Date" type="date" value={form.paymentDate} onChange={(e) => u('paymentDate', e.target.value)} />
          <Select label="Payment Mode" options={PAYMENT_MODES} value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} />
          <Input label="Reference No." value={form.referenceNo} onChange={(e) => u('referenceNo', e.target.value)} placeholder="UTR / Cheque no." />
          <div className="sm:col-span-2">
            <Input label="Remarks" value={form.remarks} onChange={(e) => u('remarks', e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function OutstandingReport() {
  const [filters, setFilters] = useState(defaultReportFilters)
  const [query, setQuery] = useState(() => toReportQuery(defaultReportFilters()))
  const [detail, setDetail] = useState(null)
  const [payCustomer, setPayCustomer] = useState(null)

  const load = useCallback(() => accountingApi.outstanding(query), [JSON.stringify(query)])
  const { data, loading, error, refresh } = useApiObject(load, [JSON.stringify(query)])

  const outstandingCustomers = data?.customers ?? []
  const outstandingVendors = data?.vendors ?? []
  const outstandingParties = data?.parties ?? []

  const customerBalanceTotal = outstandingCustomers.reduce((s, r) => s + (r.balance ?? 0), 0)
  const customerOutstandingTotal = outstandingCustomers.reduce((s, r) => s + (r.outstanding ?? 0), 0)
  const customerPendingTotal = outstandingCustomers.reduce(
    (s, r) => s + (r.totalPending ?? r.amount ?? 0),
    0,
  )
  const vendorTotal = outstandingVendors.reduce((s, r) => s + (r.totalPending ?? r.amount ?? 0), 0)

  const statusCards = useMemo(() => [
    { label: 'Backdated Balance', color: 'orange', icon: 'Scale', count: formatCurrency(customerBalanceTotal) },
    { label: 'Period Outstanding', color: 'blue', icon: 'CalendarDays', count: formatCurrency(customerOutstandingTotal) },
    { label: 'Total Pending', color: 'violet', icon: 'Users', count: formatCurrency(customerPendingTotal) },
    { label: 'Vendors', color: 'red', icon: 'Building2', count: formatCurrency(vendorTotal) },
  ], [customerBalanceTotal, customerOutstandingTotal, customerPendingTotal, vendorTotal])

  const moneyCols = (nameLabel) => [
    { key: 'name', label: nameLabel },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(r.balance ?? 0) },
    { key: 'outstanding', label: 'Outstanding', render: (r) => formatCurrency(r.outstanding ?? r.amount ?? 0) },
    {
      key: 'totalPending',
      label: 'Total Pending',
      render: (r) => formatCurrency(r.totalPending ?? ((r.balance ?? 0) + (r.outstanding ?? r.amount ?? 0))),
    },
  ]

  const openDetail = (row, kind) => {
    setDetail({
      title: `${kind}: ${row.name || '—'}`,
      lines: row.lines ?? [],
    })
  }

  const customerRowActions = (row) => [
    {
      id: 'view',
      icon: Eye,
      label: 'View',
      onClick: () => openDetail(row, 'Customer'),
    },
    {
      id: 'pay',
      icon: IndianRupee,
      label: 'Record Payment',
      variant: 'primary',
      onClick: () => setPayCustomer(row),
    },
  ]

  const tabs = [
    {
      id: 'customers',
      label: 'Customer Wise',
      content: (
        <ERPDataTable
          columns={moneyCols('Customer')}
          data={outstandingCustomers}
          showSerial={false}
          showActions
          selectable={false}
          rowActions={customerRowActions}
        />
      ),
    },
    {
      id: 'vendors',
      label: 'Vendor Wise',
      content: (
        <ERPDataTable
          columns={moneyCols('Vendor')}
          data={outstandingVendors}
          showSerial={false}
          showActions
          selectable={false}
          onView={(r) => openDetail(r, 'Vendor')}
          canEdit={() => false}
          canDelete={() => false}
          canPrint={() => false}
        />
      ),
    },
    {
      id: 'parties',
      label: 'Party Provisions',
      content: (
        <ERPDataTable
          columns={moneyCols('Party')}
          data={outstandingParties}
          showSerial={false}
          showActions
          selectable={false}
          onView={(r) => openDetail(r, 'Party')}
          canEdit={() => false}
          canDelete={() => false}
          canPrint={() => false}
        />
      ),
    },
  ]

  return (
    <ERPContentPage module="Accounting" title="Outstanding Report" report>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        <strong>Balance</strong> = backdated pending (before From date),{' '}
        <strong>Outstanding</strong> = pending in the selected date range,{' '}
        <strong>Total Pending</strong> = Balance + Outstanding. Use View for LNo / LR Date / Amount.
        On Customer Wise, use Pay to record a receipt against a line.
      </p>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <StatusSummaryCards cards={statusCards} />
        <ReportFilterRow
          showCustomer
          showVendor
          value={filters}
          onChange={setFilters}
          onApply={() => setQuery(toReportQuery(filters))}
        />
        <Card className="!p-2.5 sm:!p-3">
          {loading ? <p className="p-4 text-sm text-slate-500">Loading…</p> : <Tabs tabs={tabs} fill />}
        </Card>
      </div>

      <OutstandingLinesModal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title}
        lines={detail?.lines}
      />

      <CustomerPaymentModal
        open={Boolean(payCustomer)}
        onClose={() => setPayCustomer(null)}
        customer={payCustomer}
        onPaid={() => refresh()}
      />
    </ERPContentPage>
  )
}
