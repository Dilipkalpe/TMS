import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { formatCurrency } from '../ui/ReportFilters'

const KPI_ICONS = {
  totalLr: 'FileText',
  inTransit: 'Truck',
  delivered: 'PackageCheck',
  pendingDelivery: 'Clock',
  todaysRevenue: 'IndianRupee',
  monthlyRevenue: 'TrendingUp',
}

const KPI_COLORS = {
  totalLr: 'from-blue-500 to-blue-600',
  inTransit: 'from-violet-500 to-violet-600',
  delivered: 'from-emerald-500 to-emerald-600',
  pendingDelivery: 'from-amber-500 to-orange-500',
  todaysRevenue: 'from-teal-500 to-teal-600',
  monthlyRevenue: 'from-indigo-500 to-indigo-600',
}

function formatKpiValue(key, value) {
  if (key === 'todaysRevenue' || key === 'monthlyRevenue') {
    return formatCurrency(value)
  }
  return Number(value).toLocaleString('en-IN')
}

export default function DashboardKpiRow({ kpis = [], loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = Icons[KPI_ICONS[kpi.key] || 'Activity'] || Icons.Activity
        const gradient = KPI_COLORS[kpi.key] || 'from-slate-500 to-slate-600'
        return (
          <div
            key={kpi.key}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`absolute -right-3 -top-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradient} opacity-15`} />
            <div className="flex items-start justify-between gap-2">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                <Icon className="h-4 w-4" />
              </div>
              {kpi.trendPct != null && (
                <span className={`text-xs font-semibold ${kpi.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.trendUp ? '↑' : '↓'} {kpi.trendPct}%
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {formatKpiValue(kpi.key, kpi.value)}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{kpi.label}</p>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardQuickActions() {
  const actions = [
    { label: 'New LR', shortcut: 'F2', path: '/lr/entry', icon: 'FilePlus', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'New Booking', shortcut: 'F6', path: '/bookings/new', icon: 'CalendarPlus', color: 'bg-violet-600 hover:bg-violet-700' },
    { label: 'Loading Slip', shortcut: 'F7', path: '/operations/loading-slip', icon: 'ClipboardList', color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'Delivery', shortcut: 'F8', path: '/operations/delivery-complete', icon: 'PackageCheck', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'POD', shortcut: '', path: '/operations/delivery/pod', icon: 'Upload', color: 'bg-cyan-600 hover:bg-cyan-700' },
    { label: 'Billing', shortcut: 'F10', path: '/operations/billing/invoice', icon: 'Receipt', color: 'bg-orange-600 hover:bg-orange-700' },
    { label: 'Reports', shortcut: 'F11', path: '/reports', icon: 'BarChart3', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'Customers', shortcut: 'F12', path: '/customers', icon: 'Users', color: 'bg-teal-600 hover:bg-teal-700' },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {actions.map((action) => {
          const Icon = Icons[action.icon] || Icons.Zap
          return (
            <Link
              key={action.path}
              to={action.path}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-white transition-colors ${action.color}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
              {action.shortcut && (
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-mono">{action.shortcut}</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
