import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import StatusSummaryCards from '../../components/ui/StatusSummaryCards'
import { hrCards } from '../../config/hrHub'
import { useApiObject } from '../../hooks/useApiResource'
import { hrApi } from '../../services/api'

export default function HrHub() {
  const { data: summary, loading, error } = useApiObject(() => hrApi.summary(), [])

  const cards = summary ? [
    { label: 'Total Employees', color: 'blue', icon: 'Users', count: summary.totalEmployees },
    { label: 'Active', color: 'green', icon: 'UserCheck', count: summary.activeEmployees },
    { label: 'On Leave', color: 'amber', icon: 'CalendarOff', count: summary.onLeave },
    { label: 'Pending Leaves', color: 'violet', icon: 'Clock', count: summary.pendingLeaves },
    { label: 'Present Today', color: 'green', icon: 'CalendarCheck', count: summary.todayPresent },
    { label: 'Absent Today', color: 'red', icon: 'UserX', count: summary.todayAbsent },
  ] : []

  return (
    <ERPContentPage module="HR" title="HR Hub">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {!loading && cards.length > 0 && <StatusSummaryCards cards={cards} />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hrCards.map((item) => {
            const Icon = Icons[item.icon] || Icons.Users
            return (
              <Link key={item.path} to={item.path}>
                <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </ERPContentPage>
  )
}
