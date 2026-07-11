import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { TablePrintButton } from '../../components/print/ReportPrintButton'
import { payrollApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, Calculator, CheckCircle, Loader2, Trash2, Wallet } from 'lucide-react'

const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque', 'UPI']

export default function PayrollDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [run, setRun] = useState(null)
  const [entries, setEntries] = useState([])
  const [accounting, setAccounting] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [paymentMode, setPaymentMode] = useState('Bank Transfer')
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, e, a] = await Promise.all([
        payrollApi.getRun(id),
        payrollApi.entries(id),
        payrollApi.accounting(id).catch(() => []),
      ])
      setRun(r)
      setEntries(e)
      setAccounting(a)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const entryColumns = [
    { key: 'employeeId', label: 'ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'employmentType', label: 'Employment', render: (r) => r.employmentType ?? '—' },
    { key: 'employeeType', label: 'Role' },
    { key: 'daysWorked', label: 'Days' },
    { key: 'basicSalary', label: 'Basic', render: (r) => formatCurrency(r.basicSalary) },
    { key: 'tmsAllowance', label: 'TMS', render: (r) => formatCurrency(r.tmsAllowance ?? 0) },
    { key: 'grossPay', label: 'Gross', render: (r) => formatCurrency(r.grossPay) },
    { key: 'pfDeduction', label: 'PF', render: (r) => formatCurrency(r.pfDeduction) },
    { key: 'esiDeduction', label: 'ESI', render: (r) => formatCurrency(r.esiDeduction) },
    { key: 'insuranceDeduction', label: 'Insurance', render: (r) => formatCurrency(r.insuranceDeduction) },
    { key: 'advanceRecovery', label: 'Advance', render: (r) => formatCurrency(r.advanceRecovery) },
    { key: 'netPay', label: 'Net Pay', render: (r) => formatCurrency(r.netPay) },
    { key: 'paymentStatus', label: 'Status', render: (r) => <Badge variant={statusVariant(r.paymentStatus)}>{r.paymentStatus}</Badge>, printValue: (r) => r.paymentStatus },
  ]

  const act = async (label, fn, successMsg) => {
    setBusy(true)
    try {
      const result = await fn()
      toast({
        title: label,
        message: successMsg ?? (result?.voucherNo
          ? `Posted to accounting — Payment Voucher ${result.voucherNo}`
          : 'Payroll updated successfully.'),
        type: 'success',
      })
      await load()
    } catch (err) {
      toast({ title: 'Action failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const attendantColumns = [
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'linkType', label: 'Type' },
    { key: 'debitLedger', label: 'Debit Ledger' },
    { key: 'creditLedger', label: 'Credit Ledger' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'paymentMode', label: 'Mode' },
    { key: 'voucherDate', label: 'Date' },
  ]

  if (loading) {
    return (
      <ERPContentPage module="Payroll" title="Payroll Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !run) {
    return (
      <ERPContentPage module="Payroll" title="Payroll Details">
        <p className="text-sm text-red-600">{error || 'Payroll run not found.'}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/payroll/runs')}>Back</Button>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage
      module="Payroll"
      title={run.runCode}
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/payroll/runs')}>Back</Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
            <TablePrintButton
              title="Payroll Sheet"
              subtitle={`${run.periodLabel} · ${run.runCode}`}
              columns={entryColumns}
              rows={entries}
              summary={`Gross: ${formatCurrency(run.totalGross)} · Net: ${formatCurrency(run.totalNet)} · ${entries.length} employees`}
            />
            {run.status === 'Draft' && (
              <>
                <Button icon={busy ? Loader2 : CheckCircle} disabled={busy} onClick={() => act('Processed', () => payrollApi.process(id))}>
                  Process
                </Button>
                <Button variant="danger" icon={Trash2} disabled={busy} onClick={() => act('Cancelled', () => payrollApi.cancel(id))}>
                  Cancel
                </Button>
              </>
            )}
            {run.status === 'Processed' && (
              <div className="flex flex-wrap items-end gap-2">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <Button
                  icon={busy ? Loader2 : Wallet}
                  disabled={busy}
                  onClick={() => act('Paid', () => payrollApi.pay(id, paymentMode))}
                >
                  Mark Paid & Post to Accounting
                </Button>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Period', value: run.periodLabel },
            { label: 'Employees', value: run.entryCount },
            { label: 'Total Gross', value: formatCurrency(run.totalGross) },
            { label: 'Total Net', value: formatCurrency(run.totalNet) },
          ].map((f) => (
            <Card key={f.label} className="!p-3">
              <p className="text-xs font-medium uppercase text-slate-500">{f.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{f.value}</p>
            </Card>
          ))}
        </div>
        {(run.voucherNo || accounting.length > 0) && (
          <Card padding={false} className="border-primary/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 bg-primary/5 px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <CardHeader title="Accounting Link (Attendants)" subtitle="Auto-posted vouchers in Payment & Journal registers" />
              </div>
              <Link to="/accounting/payment-register" className="text-sm font-medium text-primary hover:underline">
                View Payment Register →
              </Link>
            </div>
            <ERPDataTable columns={attendantColumns} data={accounting} showActions={false} />
          </Card>
        )}
        <Card padding={false}>
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800 sm:px-4">
            <CardHeader title="Payroll Entries" subtitle="Driver-wise salary breakdown" />
          </div>
          <ERPDataTable columns={entryColumns} data={entries} showActions={false} />
        </Card>
      </div>
    </ERPContentPage>
  )
}
