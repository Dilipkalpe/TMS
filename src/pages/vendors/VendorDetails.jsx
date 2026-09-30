import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Tabs from '../../components/ui/Tabs'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiItem, useApiResource } from '../../hooks/useApiResource'
import { vendorsApi, expensesApi, tdsApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '../../components/print/PrintButton'

export default function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item: vendor, loading, error } = useApiItem(vendorsApi.get, id, [id])
  const { data: expenses } = useApiResource(() => expensesApi.list(), [])
  const { data: tdsPayments } = useApiResource(
    () => (id ? tdsApi.vendorPayments({ vendorId: id }) : Promise.resolve([])),
    [id],
  )
  const { data: tdsTxns } = useApiResource(
    () => (id ? tdsApi.transactions({ partyId: id, direction: 'PAYABLE' }) : Promise.resolve([])),
    [id],
  )

  const vendorExpenses = useMemo(
    () => (expenses || []).filter((e) => e.vendor && vendor && e.vendor === vendor.name),
    [expenses, vendor],
  )

  const purchaseBills = vendorExpenses.map((e) => ({
    billNo: e.id,
    date: e.date,
    amount: e.amount,
    gst: Math.round(e.amount * 0.18),
    total: e.amount + Math.round(e.amount * 0.18),
    status: e.status,
  }))

  const ledgerForVendor = useMemo(() => {
    let balance = 0
    const expenseRows = [...vendorExpenses]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((e) => {
        balance += Number(e.amount) || 0
        return {
          date: e.date,
          voucher: e.id,
          particular: e.description || e.category || 'Expense',
          debit: e.amount,
          credit: 0,
          balance,
        }
      })
    const paymentRows = (tdsPayments || []).map((p) => {
      balance -= Number(p.grossAmount) || 0
      return {
        date: p.paymentDate,
        voucher: p.paymentNo,
        particular: `Payment (TDS ${Number(p.tdsAmount) || 0})`,
        debit: 0,
        credit: p.grossAmount,
        balance,
      }
    })
    return [...expenseRows, ...paymentRows].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [vendorExpenses, tdsPayments])

  const paymentHistory = useMemo(() => (
    (tdsPayments || []).map((p) => ({
      date: p.paymentDate,
      voucher: p.paymentNo,
      particular: p.narration || `Vendor payment · mode ${p.paymentMode || '—'}`,
      debit: 0,
      credit: p.netAmount,
      balance: p.grossAmount,
      tdsAmount: p.tdsAmount,
      grossAmount: p.grossAmount,
      status: p.status,
    })).sort((a, b) => String(b.date).localeCompare(String(a.date)))
  ), [tdsPayments])

  const billColumns = [
    { key: 'billNo', label: 'Bill No.' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'gst', label: 'GST', render: (r) => formatCurrency(r.gst) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  const ledgerColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '-') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '-') },
    { key: 'balance', label: 'Balance', render: (r) => formatCurrency(Math.abs(r.balance)) },
  ]

  const paymentColumns = [
    { key: 'date', label: 'Date' },
    { key: 'voucher', label: 'Payment / Voucher' },
    { key: 'particular', label: 'Particular' },
    { key: 'grossAmount', label: 'Gross', render: (r) => formatCurrency(r.grossAmount ?? r.credit) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => (r.tdsAmount ? formatCurrency(r.tdsAmount) : '-') },
    { key: 'credit', label: 'Net Paid', render: (r) => formatCurrency(r.credit) },
    { key: 'status', label: 'Status' },
  ]

  const tdsPaymentColumns = [
    { key: 'paymentNo', label: 'Payment No' },
    { key: 'paymentDate', label: 'Date' },
    { key: 'grossAmount', label: 'Gross', render: (r) => formatCurrency(r.grossAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
    { key: 'netAmount', label: 'Net', render: (r) => formatCurrency(r.netAmount) },
    { key: 'sectionCode', label: 'Section', render: (r) => r.sectionCode || r.tdsSectionId || '—' },
    { key: 'tdsRatePercent', label: 'Rate %', render: (r) => (r.tdsRatePercent != null ? r.tdsRatePercent : '—') },
    { key: 'paymentMode', label: 'Mode' },
    { key: 'status', label: 'Status' },
  ]

  const tdsTxnColumns = [
    { key: 'transactionDate', label: 'Date' },
    { key: 'sectionCode', label: 'Section' },
    { key: 'baseAmount', label: 'Base', render: (r) => formatCurrency(r.baseAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
    { key: 'ratePercent', label: 'Rate %' },
    { key: 'sourceRef', label: 'Source' },
    { key: 'financialYear', label: 'FY' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'POSTED' ? 'success' : 'warning'}>{r.status}</Badge> },
  ]

  if (loading) {
    return (
      <ERPContentPage module="Vendors" title="Vendor Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !vendor) {
    return (
      <ERPContentPage module="Vendors" title="Vendor Details">
        <p className="text-sm text-red-500">{error || 'Vendor not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vendors')}>Back</Button>
      </ERPContentPage>
    )
  }

  const tdsPayableTotal = (tdsTxns || [])
    .filter((t) => t.status === 'POSTED')
    .reduce((s, t) => s + Number(t.tdsAmount || 0), 0)

  const printFields = [
    { label: 'Vendor Name', value: vendor.name },
    { label: 'Category', value: vendor.category },
    { label: 'Contact', value: vendor.contact },
    { label: 'Phone', value: vendor.phone },
    { label: 'Email', value: vendor.email },
    { label: 'GST', value: vendor.gst },
    { label: 'PAN', value: vendor.pan },
    { label: 'TDS Applicable', value: vendor.tdsApplicable ? 'Yes' : 'No' },
    { label: 'TDS Payable (posted)', value: formatCurrency(tdsPayableTotal) },
    { label: 'Address', value: vendor.address },
    { label: 'Outstanding', value: formatCurrency(vendor.outstanding) },
  ]

  const tabs = [
    { id: 'bills', label: 'Purchase Bills', content: <ERPDataTable columns={billColumns} data={purchaseBills} showActions={false} selectable={false} /> },
    { id: 'ledger', label: 'Ledger', content: <ERPDataTable columns={ledgerColumns} data={ledgerForVendor} showActions={false} selectable={false} /> },
    { id: 'payments', label: 'Payment History', content: <ERPDataTable columns={paymentColumns} data={paymentHistory} showActions={false} selectable={false} /> },
    {
      id: 'tds-payments',
      label: `Vendor Payments (TDS) (${(tdsPayments || []).length})`,
      content: (tdsPayments || []).length === 0
        ? <p className="px-2 py-4 text-sm text-slate-500">No TDS vendor payments recorded for this vendor.</p>
        : <ERPDataTable columns={tdsPaymentColumns} data={tdsPayments} showActions={false} selectable={false} />,
    },
    {
      id: 'tds-txns',
      label: `TDS Transactions (${(tdsTxns || []).length})`,
      content: (tdsTxns || []).length === 0
        ? <p className="px-2 py-4 text-sm text-slate-500">No TDS payable transactions for this vendor.</p>
        : (
          <div>
            <p className="mb-2 px-2 text-sm text-slate-600 dark:text-slate-400">
              Posted TDS payable total: <strong>{formatCurrency(tdsPayableTotal)}</strong>
            </p>
            <ERPDataTable columns={tdsTxnColumns} data={tdsTxns} showActions={false} selectable={false} />
          </div>
        ),
    },
  ]

  return (
    <ERPContentPage
      module="Vendors"
      title={vendor.name}
      toolbar={
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/vendors')}>Back</Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{vendor.category}</span>
            {vendor.tdsApplicable && <Badge variant="info">TDS</Badge>}
            <PrintButton title="Vendor Profile" subtitle={vendor.name} fields={printFields} />
          </div>
        </div>
      }
    >
      <div className="mb-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-4">
        <div><p className="text-xs text-slate-500">PAN</p><p className="font-semibold">{vendor.pan || '—'}</p></div>
        <div><p className="text-xs text-slate-500">TDS Applicable</p><p className="font-semibold">{vendor.tdsApplicable ? 'Yes' : 'No'}</p></div>
        <div><p className="text-xs text-slate-500">Posted TDS Payable</p><p className="font-semibold text-amber-600">{formatCurrency(tdsPayableTotal)}</p></div>
        <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-semibold">{formatCurrency(vendor.outstanding)}</p></div>
      </div>
      <Card className="!p-2.5 sm:!p-3">
        <Tabs tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
