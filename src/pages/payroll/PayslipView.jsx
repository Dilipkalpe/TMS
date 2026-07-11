import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import PrintCompanyHeader from '../../components/print/PrintCompanyHeader'
import PayslipPrintFormat, { payslipTotals } from '../../components/print/PayslipPrintFormat'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { payrollApi } from '../../services/api'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'

export default function PayslipView() {
  const { entryId } = useParams()
  const { company, print } = usePrint()
  const { toast } = useToast()
  const [slip, setSlip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSlip(await payrollApi.getPayslip(entryId))
    } catch (err) {
      setSlip(null)
      setError(err.message || 'Failed to load payslip')
      toast({ title: 'Failed to load payslip', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [entryId, toast])

  useEffect(() => { load() }, [load])

  const handlePrint = () => {
    if (!slip) return
    print(<PayslipPrintFormat company={company} slip={slip} />)
  }

  if (loading) {
    return (
      <ERPContentPage module="Payroll" title="Payslip">
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </ERPContentPage>
    )
  }

  if (!slip) {
    return (
      <ERPContentPage module="Payroll" title="Payslip">
        <p className="text-slate-500">{error || 'Payslip not found.'}</p>
      </ERPContentPage>
    )
  }

  const { earnings, deductions, totalDeductions } = payslipTotals(slip)

  return (
    <ERPContentPage module="Payroll" title={`Payslip — ${slip.employeeName}`}>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/payroll/payslips" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Payslips
        </Link>
        <Button variant="outline" icon={Printer} className="no-print" onClick={handlePrint}>
          Print Payslip
        </Button>
      </div>

      <Card id="payslip-print">
        <div className="p-6">
          <PrintCompanyHeader
            company={company}
            documentTitle="Salary Payslip"
            documentSubtitle={`Pay Period: ${slip.periodLabel}`}
            meta={[
              { label: 'Payslip No', value: slip.runCode },
              { label: 'Status', value: slip.paymentStatus },
            ]}
          />
        </div>

        <div className="grid gap-4 border-t px-6 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Employee</p>
            <p className="font-semibold">{slip.employeeName}</p>
            <p className="text-sm text-slate-600">{slip.employeeId} · {slip.employeeType} · {slip.employmentType ?? 'Permanent'}</p>
            {slip.daysWorked > 0 && <p className="text-sm text-slate-500">Days worked: {slip.daysWorked}</p>}
            {slip.departmentName && <p className="text-sm">{slip.departmentName} — {slip.designationName}</p>}
          </div>
          <div className="text-right">
            <Badge variant={statusVariant(slip.paymentStatus)}>{slip.paymentStatus}</Badge>
            <p className="mt-2 text-2xl font-bold text-primary">{formatCurrency(slip.netPay)}</p>
            <p className="text-xs text-slate-500">Net Pay</p>
          </div>
        </div>

        <div className="grid gap-4 border-t p-6 sm:grid-cols-2">
          <div>
            <CardHeader title="Earnings" />
            <table className="w-full text-sm">
              <tbody>
                {earnings.map((r) => (
                  <tr key={r.label} className="border-b border-slate-100">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Gross Pay</td>
                  <td className="py-2 text-right">{formatCurrency(slip.grossPay)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <CardHeader title="Deductions" />
            <table className="w-full text-sm">
              <tbody>
                {deductions.map((r) => (
                  <tr key={r.label} className="border-b border-slate-100">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-red-600">
                  <td className="py-2">Total Deductions</td>
                  <td className="py-2 text-right">{formatCurrency(totalDeductions)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </ERPContentPage>
  )
}
