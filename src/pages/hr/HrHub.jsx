import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { hrPayrollHubSections } from '../../config/hrPayrollHub'
import { useApiObject } from '../../hooks/useApiResource'
import { hrApi, payrollApi } from '../../services/api'

export default function HrHub() {
  const { data: hrSummary, loading: hrLoading, error: hrError } = useApiObject(() => hrApi.summary(), [])
  const { data: paySummary, loading: payLoading, error: payError } = useApiObject(() => payrollApi.summary(), [])

  const kpiCards = [
    ...(hrSummary ? [
      { label: 'Total Employees', color: 'blue', icon: 'Users', count: hrSummary.totalEmployees },
      { label: 'Active', color: 'green', icon: 'UserCheck', count: hrSummary.activeEmployees },
      { label: 'On Leave', color: 'amber', icon: 'CalendarOff', count: hrSummary.onLeave },
      { label: 'Present Today', color: 'green', icon: 'CalendarCheck', count: hrSummary.todayPresent },
    ] : []),
    ...(paySummary ? [
      { label: 'Draft Runs', color: 'amber', icon: 'FileEdit', count: paySummary.draftRuns },
      { label: 'Total Paid', color: 'green', icon: 'IndianRupee', count: formatCurrency(paySummary.totalPaidAmount) },
    ] : []),
  ]

  const error = hrError || payError
  const loading = hrLoading || payLoading

  return (
    <ERPContentPage module="HR & Payroll" title="HR & Payroll">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {!loading && kpiCards.length > 0 && <StatusSummaryCards cards={kpiCards} />}
        {paySummary?.lastRunPeriod && (
          <p className="text-sm text-slate-500">
            Last payroll period:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">{paySummary.lastRunPeriod}</span>
          </p>
        )}
        <HubCardGrid sections={hrPayrollHubSections} iconFallback="Briefcase" columns="lg" />
      </div>
    </ERPContentPage>
  )
}
