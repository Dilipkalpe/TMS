import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { hrPayrollHubSections } from '../../config/hrPayrollHub'
import { useApiObject } from '../../hooks/useApiResource'
import { useSubscription } from '../../context/SubscriptionContext'
import { hrApi, payrollApi } from '../../services/api'

export default function HrHub() {
  const { canAccessPath } = useSubscription()
  const { data: hrSummary, loading: hrLoading, error: hrError } = useApiObject(() => hrApi.summary(), [])
  const { data: paySummary, loading: payLoading, error: payError } = useApiObject(() => payrollApi.summary(), [])

  const error = hrError || payError
  const loading = hrLoading || payLoading

  const kpis = []
  if (!loading && hrSummary) {
    kpis.push(
      { label: 'Employees', value: String(hrSummary.totalEmployees ?? 0), hint: `${hrSummary.activeEmployees ?? 0} active`, tone: 'ok' },
      { label: 'On leave', value: String(hrSummary.onLeave ?? 0), hint: 'currently away', tone: 'warn' },
      { label: 'Present today', value: String(hrSummary.todayPresent ?? 0), hint: 'attendance marked' },
    )
  }
  if (!loading && paySummary) {
    kpis.push(
      { label: 'Draft runs', value: String(paySummary.draftRuns ?? 0), hint: 'pending process', tone: paySummary.draftRuns ? 'warn' : 'default' },
      { label: 'Total paid', value: formatCurrency(paySummary.totalPaidAmount), hint: paySummary.lastRunPeriod ? `Last: ${paySummary.lastRunPeriod}` : 'Payroll paid' },
    )
  }

  return (
    <CommandCenterHub
      module="HR & Payroll"
      title="HR & Payroll"
      eyebrow="People"
      headline="Workforce & payroll"
      description="Manage employees, attendance, leave, and monthly payroll in one workspace."
      quickActions={[
        { label: 'Employees', path: '/hr/employees', variant: 'accent' },
        { label: 'Generate payroll', path: '/payroll/generate', variant: 'ghost' },
        { label: 'Attendance', path: '/hr/attendance', variant: 'ghost' },
      ]}
      kpis={kpis.slice(0, 4)}
      sections={hrPayrollHubSections}
      canAccessPath={canAccessPath}
      iconFallback="Briefcase"
      columns="lg"
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </CommandCenterHub>
  )
}
