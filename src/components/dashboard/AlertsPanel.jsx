import { AlertTriangle, Info, XCircle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAlerts } from '../../context/AlertsContext'

const ICONS = { warning: AlertTriangle, info: Info, error: XCircle }
const STYLES = {
  warning: 'border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40',
  info: 'border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/40',
  error: 'border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/40',
}

export default function AlertsPanel({ limit = 4 } = {}) {
  const { alerts } = useAlerts()
  const navigate = useNavigate()
  const shown = alerts.slice(0, limit)

  if (!shown.length) return null

  return (
    <div className="mb-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/50 to-white p-3 dark:border-amber-900/50 dark:from-amber-950/20 dark:to-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">Action Required</p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 space-y-2 sm:grid-cols-2 sm:space-y-0 sm:[&>*]:mb-2">
        {shown.map((a) => {
          const Icon = ICONS[a.type] ?? Info
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(a.path)}
              className={`flex items-center space-x-2 rounded-lg border p-2.5 text-left transition-all hover:shadow-sm ${STYLES[a.type]}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                <p className="truncate text-[10px] text-slate-500">{a.message}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
