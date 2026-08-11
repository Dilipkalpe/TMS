import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchApiHealth } from '../../services/api'

const POLL_MS = 5000
const FAILS_BEFORE_OFFLINE = 2

function isHealthy(result) {
  return result.reachable && result.ok && result.status === 'healthy'
}

export default function ApiStatusIndicator({ className = '' }) {
  const [connected, setConnected] = useState(null)
  const failStreak = useRef(0)
  const busy = useRef(false)

  const refresh = useCallback(async (initial = false) => {
    if (busy.current) return
    busy.current = true
    try {
      const result = await fetchApiHealth()
      if (isHealthy(result)) {
        failStreak.current = 0
        setConnected(true)
        return
      }

      failStreak.current += 1
      if (failStreak.current >= FAILS_BEFORE_OFFLINE) {
        setConnected(false)
      } else if (initial) {
        setConnected(false)
      }
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    refresh(true)
    const id = setInterval(() => refresh(false), POLL_MS)

    const recheck = () => {
      if (document.visibilityState === 'visible') refresh(false)
    }
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [refresh])

  const loading = connected === null
  const text = loading
    ? 'Checking API…'
    : connected
      ? 'API Connected'
      : 'API Not Connected'

  const dotClass = loading
    ? 'bg-slate-400 animate-pulse'
    : connected
      ? 'bg-emerald-500'
      : 'bg-red-500'

  return (
    <p
      className={`flex items-center justify-center gap-2 text-center text-xs ${className} ${
        loading
          ? 'text-slate-500'
          : connected
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      {text}
    </p>
  )
}
