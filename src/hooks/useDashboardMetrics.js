import { useMemo } from 'react'
import { bookings } from '../data/bookings'
import { expenses } from '../data/expenses'
import { vehicles } from '../data/vehicles'
import {
  monthlyRevenue,
  monthlyExpenses,
  tripAnalysis,
  vehicleUtilization,
  expenseBreakdown,
  weeklyBookings,
  routePerformance,
  driverPerformance,
  paymentMix,
  fleetStatus,
} from '../data/dashboard'
import { formatChange } from '../utils/export'

const PERIOD_MONTHS = { '3m': 3, '6m': 6, '12m': 12, ytd: 12 }

function sliceByPeriod(data, period) {
  const n = PERIOD_MONTHS[period] ?? 12
  return data.slice(-n)
}

function scaleSeries(data, factor) {
  return data.map((d) => ({
    ...d,
    value: Math.round((d.value ?? 0) * factor),
    utilization: d.utilization ? Math.min(100, Math.round(d.utilization * factor)) : undefined,
    revenue: d.revenue ? Math.round(d.revenue * factor) : undefined,
    expense: d.expense ? Math.round(d.expense * factor) : undefined,
    profit: d.profit ? Math.round(d.profit * factor) : undefined,
  }))
}

function sumValues(data, key = 'value') {
  return data.reduce((s, d) => s + (d[key] ?? d.revenue ?? 0), 0)
}

export function useDashboardMetrics({ period = '12m', compare = false, refreshSeed = 0 } = {}) {
  return useMemo(() => {
    const factor = 1 + (refreshSeed % 3) * 0.02
    const revSlice = scaleSeries(sliceByPeriod(monthlyRevenue, period), factor)
    const expSlice = scaleSeries(sliceByPeriod(monthlyExpenses, period), factor)
    const profitTrend = revSlice.map((r, i) => ({
      month: r.month,
      revenue: r.value,
      expense: expSlice[i]?.value ?? 0,
      profit: r.value - (expSlice[i]?.value ?? 0),
    }))

    const prevRevSlice = scaleSeries(
      sliceByPeriod(monthlyRevenue, period).slice(0, -1),
      factor * 0.92,
    )
    const currentRevTotal = sumValues(revSlice)
    const prevRevTotal = sumValues(prevRevSlice) || currentRevTotal * 0.88
    const currentExpTotal = sumValues(expSlice)
    const prevExpTotal = currentExpTotal * 0.91

    const revChange = formatChange(currentRevTotal, prevRevTotal)
    const expChange = formatChange(currentExpTotal, prevExpTotal)

    const unpaidBookings = bookings.filter((b) => b.payment === 'Unpaid' || b.payment === 'Partial')
    const pendingBookings = bookings.filter((b) => b.status === 'Pending')
    const maintenanceVehicles = vehicles.filter((v) => v.status === 'Maintenance')

    const totalFreight = bookings.reduce((s, b) => s + (b.freight ?? 0), 0)
    const totalExpense = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
    const netProfit = totalFreight - totalExpense

    const fleetGauge = Math.round(
      vehicles.filter((v) => v.status === 'Active').length / Math.max(vehicles.length, 1) * 100 * factor,
    )

    const periodLabel =
      period === 'ytd' ? 'YTD FY 2025-26' : `Last ${PERIOD_MONTHS[period]} months`

    return {
      periodLabel,
      compareLabel: compare ? 'vs previous period' : null,
      revChange,
      expChange,
      revSlice,
      expSlice,
      profitTrend,
      tripAnalysis,
      vehicleUtilization,
      expenseBreakdown,
      weeklyBookings: scaleSeries(weeklyBookings, factor),
      routePerformance: scaleSeries(routePerformance, factor),
      driverPerformance: scaleSeries(driverPerformance, factor),
      paymentMix,
      fleetStatus,
      fleetGauge,
      kpis: {
        totalFreight,
        totalExpense,
        netProfit,
        unpaidCount: unpaidBookings.length,
        pendingCount: pendingBookings.length,
        maintenanceCount: maintenanceVehicles.length,
        activeVehicles: vehicles.filter((v) => v.status === 'Active').length,
      },
    }
  }, [period, compare, refreshSeed])
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
