import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Info, XCircle, CheckCheck } from 'lucide-react'
import { useAlerts } from '../../context/AlertsContext'

const ICONS = {
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
}

const ICON_STYLES = {
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  error: 'text-red-500 bg-red-50 dark:bg-red-950',
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { alerts, unreadCount, dismissAlert, dismissAll } = useAlerts()

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const handleClick = (alert) => {
    navigate(alert.path)
    dismissAlert(alert.id)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2.5 text-primary transition-all hover:bg-primary/10 dark:text-blue-200 dark:hover:bg-primary/20"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Notifications</h3>
            {alerts.length > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center space-x-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">All caught up — no new alerts</p>
            ) : (
              alerts.map((a) => {
                const Icon = ICONS[a.type] ?? Info
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleClick(a)}
                    className="flex w-full items-start space-x-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_STYLES[a.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{a.time}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
