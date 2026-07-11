import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatCurrency } from '../ui/ReportFilters'

function buildEarnings(slip) {
  const basicLabel = slip.employmentType === 'Daily' ? 'Daily Wage (days worked)' : 'Basic Salary'
  return [
    { label: basicLabel, amount: slip.basicSalary },
    { label: 'Trip Incentive', amount: slip.tripIncentive },
    { label: 'TMS Allowances', amount: slip.tmsAllowance },
    { label: 'Overtime', amount: slip.overtime },
    { label: 'Other Allowances', amount: slip.otherAllowance },
  ].filter((r) => r.amount > 0)
}

function buildDeductions(slip) {
  return [
    { label: 'PF Deduction', amount: slip.pfDeduction },
    { label: 'ESI Deduction', amount: slip.esiDeduction },
    { label: 'Insurance', amount: slip.insuranceDeduction },
    { label: 'Advance Recovery', amount: slip.advanceRecovery },
    { label: 'Other Deductions', amount: slip.otherDeduction },
  ].filter((r) => r.amount > 0)
}

export function payslipTotals(slip) {
  const earnings = buildEarnings(slip)
  const deductions = buildDeductions(slip)
  const totalDeductions = (slip.pfDeduction || 0) + (slip.esiDeduction || 0)
    + (slip.insuranceDeduction || 0) + (slip.advanceRecovery || 0) + (slip.otherDeduction || 0)
  return { earnings, deductions, totalDeductions }
}

export default function PayslipPrintFormat({ company, slip }) {
  const { earnings, deductions, totalDeductions } = payslipTotals(slip)

  return (
    <div className="print-document">
      <PrintCompanyHeader
        company={company}
        documentTitle="Salary Payslip"
        documentSubtitle={`Pay Period: ${slip.periodLabel}`}
        meta={[
          { label: 'Payslip No', value: slip.runCode },
          { label: 'Status', value: slip.paymentStatus },
          ...(slip.paidAt ? [{ label: 'Paid On', value: slip.paidAt.slice(0, 10) }] : []),
        ]}
      />

      <table className="print-table mb-4">
        <tbody>
          <tr>
            <th>Employee Name</th>
            <td>{slip.employeeName}</td>
            <th>Employee ID</th>
            <td>{slip.employeeId}</td>
          </tr>
          <tr>
            <th>Job Role</th>
            <td>{slip.employeeType}</td>
            <th>Employment</th>
            <td>{slip.employmentType || 'Permanent'}</td>
          </tr>
          <tr>
            <th>Department</th>
            <td>{slip.departmentName || '—'}</td>
            <th>Days Worked</th>
            <td>{slip.daysWorked > 0 ? slip.daysWorked : '—'}</td>
          </tr>
          <tr>
            <th>Designation</th>
            <td colSpan={3}>{slip.designationName || '—'}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-2 border-b border-black pb-1 text-[10pt] font-bold uppercase">Earnings</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th>Component</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="text-right">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-bold">Gross Pay</td>
                <td className="text-right font-bold">{formatCurrency(slip.grossPay)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="mb-2 border-b border-black pb-1 text-[10pt] font-bold uppercase">Deductions</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th>Component</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td className="text-right">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-bold">Total Deductions</td>
                <td className="text-right font-bold">{formatCurrency(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded border-2 border-black p-3 text-center">
        <p className="text-[9pt] uppercase tracking-wide text-gray-600">Net Pay</p>
        <p className="text-lg font-bold">{formatCurrency(slip.netPay)}</p>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
