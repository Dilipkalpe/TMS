import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranch } from '../../context/BranchContext'

export default function AppFooter() {
  const { user } = useAuth()
  const { branches, selectedBranchId } = useBranch()
  const [serverTime, setServerTime] = useState(() => new Date())
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const tick = setInterval(() => setServerTime(new Date()), 1000)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(tick)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const branchLabel = selectedBranchId && selectedBranchId !== 'all'
    ? branches.find((b) => String(b.id) === String(selectedBranchId))?.name
    : user?.branchName || 'All branches'

  const timeStr = serverTime.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  return (
    <footer className="app-footer shrink-0 border-t border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
        <span className="text-center sm:text-left">
          Logged in as <strong className="text-slate-700 dark:text-slate-300">{user?.name ?? 'User'}</strong>
          {' '}| Role: {user?.role ?? 'Operator'}
          {' '}| Branch: {branchLabel ?? '—'}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          <span>Server Time: {timeStr}</span>
          <span className={`inline-flex items-center gap-1 font-medium ${online ? 'text-emerald-600' : 'text-red-500'}`}>
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {online ? 'Connected' : 'Offline'}
          </span>
          <span className="text-slate-400">v 1.0.0</span>
        </div>
      </div>
    </footer>
  )
}
