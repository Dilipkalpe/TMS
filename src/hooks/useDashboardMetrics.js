import { useCallback, useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../services/api'
import { formatChange } from '../utils/export'

const PERIOD_MONTHS = { '3m': 3, '6m': 6, '12m': 12, ytd: 12 }

function sliceByPeriod(data, period) {
  const n = PERIOD_MONTHS[period] ?? 12
  return (data ?? []).slice(-n)
}

function sumValues(data, key = 'value') {
  return (data ?? []).reduce((s, d) => s + (d[key] ?? d.revenue ?? 0), 0)
}

function formatLakhs(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export function useDashboardMetrics({ period = '12m', compare = false, refreshSeed = 0 } = {}) {
  const [raw, setRaw] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stats = await dashboardApi.stats()
      setRaw((prev) => ({ ...(prev ?? {}), stats }))
      setLoading(false)

      const chartResults = await Promise.allSettled([
        dashboardApi.monthlyRevenue(),
        dashboardApi.monthlyExpenses(),
        dashboardApi.tripAnalysis(),
        dashboardApi.paymentMix(),
        dashboardApi.expenseBreakdown(),
        dashboardApi.fleetStatus(),
        dashboardApi.vehicleUtilization(),
        dashboardApi.weeklyBookings(),
        dashboardApi.routePerformance(),
        dashboardApi.driverPerformance(),
        dashboardApi.fleetGauge(),
      ])

      const [
        revSlice,
        expSlice,
        tripAnalysis,
        paymentMix,
        expenseBreakdown,
        fleetStatus,
        vehicleUtilization,
        weeklyBookings,
        routePerformance,
        driverPerformance,
        fleetGauge,
      ] = chartResults.map((r) => (r.status === 'fulfilled' ? r.value : null))

      const failedCharts = chartResults.filter((r) => r.status === 'rejected').length
      if (failedCharts === chartResults.length) {
        setError('Failed to load dashboard charts')
      } else if (failedCharts > 0) {
        setError('Some dashboard charts could not be loaded')
      }

      setRaw({
        stats,
        revSlice: revSlice ?? [],
        expSlice: expSlice ?? [],
        tripAnalysis: tripAnalysis ?? [],
        paymentMix: paymentMix ?? [],
        expenseBreakdown: expenseBreakdown ?? [],
        fleetStatus: fleetStatus ?? [],
        vehicleUtilization: vehicleUtilization ?? [],
        weeklyBookings: weeklyBookings ?? [],
        routePerformance: routePerformance ?? [],
        driverPerformance: driverPerformance ?? [],
        fleetGauge: fleetGauge?.value ?? 0,
      })
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
      setRaw(null)
      setLoading(false)
    }
  }, [refreshSeed])

  useEffect(() => {
    load()
  }, [load])

  return useMemo(() => {
    const periodLabel = period === 'ytd' ? 'YTD FY 2025-26' : `Last ${PERIOD_MONTHS[period]} months`
    if (!raw) {
      return {
        loading,
        error,
        refresh: load,
        periodLabel,
        compareLabel: compare ? 'vs previous period' : null,
        revChange: { text: '—', positive: true },
        expChange: { text: '—', positive: false },
        revSlice: [],
        expSlice: [],
        profitTrend: [],
        tripAnalysis: [],
        vehicleUtilization: [],
        expenseBreakdown: [],
        weeklyBookings: [],
        routePerformance: [],
        driverPerformance: [],
        paymentMix: [],
        fleetStatus: [],
        fleetGauge: 0,
        statsCards: [],
        kpis: {},
      }
    }

    const n = PERIOD_MONTHS[period] ?? 12
    const fullRev = raw.revSlice ?? []
    const fullExp = raw.expSlice ?? []
    const revSlice = fullRev.slice(-n)
    const expSlice = fullExp.slice(-n)
    const prevRevSlice = fullRev.length > n ? fullRev.slice(-n * 2, -n) : []
    const prevExpSlice = fullExp.length > n ? fullExp.slice(-n * 2, -n) : []
    const profitTrend = revSlice.map((r, i) => ({
      month: r.month,
      revenue: r.value,
      expense: expSlice[i]?.value ?? 0,
      profit: r.value - (expSlice[i]?.value ?? 0),
    }))

    const currentRevTotal = sumValues(revSlice)
    const prevRevTotal = sumValues(prevRevSlice)
    const currentExpTotal = sumValues(expSlice)
    const prevExpTotal = sumValues(prevExpSlice)

    const s = raw.stats
    const statsCards = [
      { label: 'Total Vehicles', value: String(s.totalVehicles), icon: 'Truck', color: 'blue' },
      { label: 'Total Drivers', value: String(s.totalDrivers), icon: 'UserCircle', color: 'indigo' },
      { label: 'Total Customers', value: String(s.totalCustomers), icon: 'Users', color: 'violet' },
      { label: 'Total Trips', value: String(s.totalTrips), icon: 'Route', color: 'cyan' },
      { label: 'Pending LR', value: String(s.pendingLr), icon: 'FileText', color: 'amber' },
      { label: "Today's Bookings", value: String(s.todaysBookings), icon: 'CalendarPlus', color: 'emerald' },
      { label: 'Total Income', value: formatLakhs(s.totalIncome), icon: 'TrendingUp', color: 'green' },
      { label: 'Total Expenses', value: formatLakhs(s.totalExpenses), icon: 'TrendingDown', color: 'red' },
      { label: 'Net Profit', value: formatLakhs(s.netProfit), icon: 'IndianRupee', color: 'green' },
      { label: 'Cash Balance', value: formatLakhs(s.cashBalance), icon: 'Banknote', color: 'slate' },
      { label: 'Bank Balance', value: formatLakhs(s.bankBalance), icon: 'Landmark', color: 'blue' },
    ]

    return {
      loading,
      error,
      refresh: load,
      periodLabel,
      compareLabel: compare ? 'vs previous period' : null,
      revChange: formatChange(currentRevTotal, prevRevTotal),
      expChange: formatChange(currentExpTotal, prevExpTotal),
      revSlice,
      expSlice,
      profitTrend,
      tripAnalysis: raw.tripAnalysis,
      vehicleUtilization: raw.vehicleUtilization,
      expenseBreakdown: raw.expenseBreakdown,
      weeklyBookings: raw.weeklyBookings,
      routePerformance: raw.routePerformance,
      driverPerformance: raw.driverPerformance,
      paymentMix: raw.paymentMix,
      fleetStatus: raw.fleetStatus,
      fleetGauge: raw.fleetGauge,
      statsCards,
      kpis: {
        totalFreight: s.totalIncome,
        totalExpense: s.totalExpenses,
        netProfit: s.netProfit,
        pendingCount: s.pendingLr,
        activeVehicles: s.totalVehicles,
      },
    }
  }, [raw, period, compare, loading, error, load])
}

export const DEFAULT_WIDGET_IDS = [
  'monthly-revenue',
  'monthly-expenses',
  'profit-multi',
  'revenue-stack',
  'trip-status',
  'payment-mix',
  'expense-breakdown',
  'fleet-status',
  'vehicle-util',
  'weekly-bookings',
  'route-perf',
  'top-drivers',
  'route-radar',
  'fleet-gauge',
]

export function useDashboardRecent(refreshSeed = 0) {
  const [bookings, setBookings] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([dashboardApi.recentBookings(), dashboardApi.recentTrips()])
      .then(([b, t]) => {
        if (!cancelled) {
          setBookings(b.map((r) => ({ id: r.id, customer: r.customer, route: r.route, date: r.date, status: r.status, payment: r.payment })))
          setTrips(t.map((r) => ({ lr: r.lr, vehicle: r.vehicle, driver: r.driver, from: r.from, to: r.to, freight: r.freight })))
        }
      })
      .catch(() => { if (!cancelled) { setBookings([]); setTrips([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshSeed])

  return { bookings, trips, loading }
}
