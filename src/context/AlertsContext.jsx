import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dashboardApi, getToken } from '../services/api'
import { useAuth } from './AuthContext'

const AlertsContext = createContext(null)
const DISMISS_KEY = 'tms-dismissed-alerts'

export function AlertsProvider({ children } = {}) {
  const { isAuthenticated, booting } = useAuth()
  const [allAlerts, setAllAlerts] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (booting || !isAuthenticated || !getToken()) {
      if (!isAuthenticated) setAllAlerts([])
      return
    }
    // Defer alerts so Dashboard /home paints first (alerts hit many tables).
    let cancelled = false
    const timer = window.setTimeout(() => {
      dashboardApi.alerts()
        .then((alerts) => {
          if (!cancelled) setAllAlerts(Array.isArray(alerts) ? alerts : [])
        })
        .catch(() => {
          if (!cancelled) setAllAlerts([])
        })
    }, 750)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [booting, isAuthenticated])

  const alerts = useMemo(() => allAlerts.filter((a) => !dismissed.includes(a.id)), [allAlerts, dismissed])
  const unreadCount = alerts.length

  const dismissAlert = useCallback((id) => {
    setDismissed((prev) => {
      const next = [...prev, id]
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const dismissAll = useCallback(() => {
    const ids = alerts.map((a) => a.id)
    setDismissed((prev) => {
      const next = [...new Set([...prev, ...ids])]
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
      return next
    })
  }, [alerts])

  return (
    <AlertsContext.Provider value={{ alerts, allAlerts, unreadCount, dismissAlert, dismissAll }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) {
    return { alerts: [], allAlerts: [], unreadCount: 0, dismissAlert: () => {}, dismissAll: () => {} }
  }
  return ctx
}
