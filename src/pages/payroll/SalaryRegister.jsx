import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Input, { Select } from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { TablePrintButton } from '../../components/print/ReportPrintButton'
import { useApiResource } from '../../hooks/useApiResource'
import { payrollApi } from '../../services/api'

const MONTHS = [
  { value: '', label: 'All Months' },
  ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => ({
    value: String(i + 1), label: m,
  })),
]

export default function SalaryRegister() {
  const year = new Date().getFullYear()
  const [month, setMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(String(year))
  const { data: rows, loading, error } = useApiResource(
    () => payrollApi.salaryRegister({
      month: month ? Number(month) : undefined,
      year: Number(selectedYear),
    }),
    [month, selectedYear],
  )

  const columns = [
    { key: 'periodLabel', label: 'Period' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'employeeType', label: 'Type' },
    { key: 'employmentType', label: 'Employment' },
    { key: 'daysWorked', label: 'Days' },
    { key: 'basicSalary', label: 'Basic', render: (r) => formatCurrency(r.basicSalary) },
    { key: 'tmsAllowance', label: 'TMS', render: (r) => formatCurrency(r.tmsAllowance ?? 0) },
    { key: 'grossPay', label: 'Gross', render: (r) => formatCurrency(r.grossPay) },
    { key: 'pfDeduction', label: 'PF', render: (r) => formatCurrency(r.pfDeduction) },
    { key: 'esiDeduction', label: 'ESI', render: (r) => formatCurrency(r.esiDeduction) },
    { key: 'insuranceDeduction', label: 'Insurance', render: (r) => formatCurrency(r.insuranceDeduction) },
    { key: 'netPay', label: 'Net', render: (r) => formatCurrency(r.netPay) },
    { key: 'paymentStatus', label: 'Status' },
  ]

  return (
    <ERPContentPage module="Payroll" title="Salary Register">
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4 p-4">
          <Select label="Month" options={MONTHS} value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Input label="Year" type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-28" />
          <TablePrintButton title="Salary Register" subtitle={`${selectedYear}${month ? ` — Month ${month}` : ''}`} columns={columns} rows={rows ?? []} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Salary Register" subtitle={`${rows?.length ?? 0} records`} />
        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : (
          <ERPDataTable columns={columns} data={rows ?? []} emptyMessage="No processed payroll data for selected period." />
        )}
      </Card>
    </ERPContentPage>
  )
}
