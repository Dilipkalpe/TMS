import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { bookings } from '../data/bookings'
import { vehicles } from '../data/vehicles'
import { lrList } from '../data/lr'
import { customers } from '../data/customers'

const AlertsContext = createContext(null)
const DISMISS_KEY = 'tms-dismissed-alerts'

function buildAlerts() {
  const alerts = []
  const now = new Date('2026-06-18')

  bookings
    .filter((b) => b.payment === 'Unpaid')
    .forEach((b) => {
      alerts.push({
        id: `unpaid-${b.id}`,
        type: 'warning',
        title: `Unpaid booking ${b.id}`,
        message: `${b.customer} · ₹${b.balance?.toLocaleString('en-IN')} pending`,
        path: '/bookings',
        time: b.date,
      })
    })

  bookings
    .filter((b) => b.status === 'Pending')
    .forEach((b) => {
      alerts.push({
        id: `pending-${b.id}`,
        type: 'info',
        title: `Pending booking ${b.id}`,
        message: `${b.from} → ${b.to} awaiting confirmation`,
        path: '/bookings',
        time: b.date,
      })
    })

  vehicles
    .filter((v) => v.status === 'Maintenance')
    .forEach((v) => {
      alerts.push({
        id: `maint-${v.id}`,
        type: 'error',
        title: 'Vehicle in maintenance',
        message: `${v.number} is unavailable for trips`,
        path: `/vehicles/${v.id}`,
        time: v.lastMaintenance,
      })
    })

  vehicles.forEach((v) => {
    const ins = new Date(v.insurance)
    const days = Math.ceil((ins - now) / (1000 * 60 * 60 * 24))
    if (days > 0 && days <= 60) {
      alerts.push({
        id: `ins-${v.id}`,
        type: 'warning',
        title: 'Insurance expiring soon',
        message: `${v.number} expires in ${days} days`,
        path: `/vehicles/${v.id}`,
        time: v.insurance,
      })
    }
  })

  customers
    .filter((c) => c.outstanding > 50000)
    .forEach((c) => {
      alerts.push({
        id: `out-${c.id}`,
        type: 'warning',
        title: 'High receivable',
        message: `${c.name} · ₹${c.outstanding.toLocaleString('en-IN')}`,
        path: `/customers/${c.id}`,
        time: '2026-06-18',
      })
    })

  if (lrList.length < bookings.filter((b) => b.status !== 'Cancelled').length) {
    alerts.push({
      id: 'lr-pending',
      type: 'info',
      title: 'LR generation pending',
      message: `${bookings.length - lrList.length} booking(s) without LR`,
      path: '/lr',
      time: '2026-06-18',
    })
  }

  return alerts.sort((a, b) => (b.time > a.time ? 1 : -1))
}

export function AlertsProvider({ children } = {}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  const allAlerts = useMemo(() => buildAlerts(), [])
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
    const fallback = buildAlerts()
    return { alerts: fallback, allAlerts: fallback, unreadCount: fallback.length, dismissAlert: () => {}, dismissAll: () => {} }
  }
  return ctx
}

export { buildAlerts }
