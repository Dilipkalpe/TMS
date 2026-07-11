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
    dashboardApi.alerts()
      .then((alerts) => setAllAlerts(Array.isArray(alerts) ? alerts : []))
      .catch(() => setAllAlerts([]))
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
