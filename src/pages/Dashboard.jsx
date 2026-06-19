import { useCallback, useMemo, useState } from 'react'
import ERPPageTitle from '../components/ui/ERPPageTitle'
import StatusSummaryCards from '../components/ui/StatusSummaryCards'
import AnalyticsChart from '../components/ui/AnalyticsChart'
import ERPDataTable from '../components/ui/ERPDataTable'
import Tabs from '../components/ui/Tabs'
import Badge, { statusVariant } from '../components/ui/Badge'
import AnalyticsFilterBar from '../components/dashboard/AnalyticsFilterBar'
import WidgetPickerModal from '../components/dashboard/WidgetPickerModal'
import AlertsPanel from '../components/dashboard/AlertsPanel'
import { useDashboardMetrics, DEFAULT_WIDGET_IDS } from '../hooks/useDashboardMetrics'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from '../context/ToastContext'
import { exportJson } from '../utils/export'
import {
  dashboardStats,
  recentBookings,
  recentTrips,
} from '../data/dashboard'

const colorMap = {
  indigo: 'violet',
  cyan: 'blue',
  emerald: 'green',
}

const WIDGET_DEFS = [
  { id: 'monthly-revenue', title: 'Monthly Revenue', type: 'bar' },
  { id: 'monthly-expenses', title: 'Monthly Expenses', type: 'area' },
  { id: 'profit-multi', title: 'Revenue vs Expense vs Profit', type: 'multiLine' },
  { id: 'revenue-stack', title: 'Revenue & Expense Stack', type: 'stacked' },
  { id: 'trip-status', title: 'Trip Status', type: 'donut' },
  { id: 'payment-mix', title: 'Payment Status', type: 'pie' },
  { id: 'expense-breakdown', title: 'Expense Breakdown', type: 'donut' },
  { id: 'fleet-status', title: 'Fleet Status', type: 'pie' },
  { id: 'vehicle-util', title: 'Vehicle Utilization', type: 'horizontal' },
  { id: 'weekly-bookings', title: 'Weekly Bookings', type: 'line' },
  { id: 'route-perf', title: 'Route Performance', type: 'bar' },
  { id: 'top-drivers', title: 'Top Drivers', type: 'grouped' },
  { id: 'route-radar', title: 'Route Radar', type: 'radar' },
  { id: 'fleet-gauge', title: 'Fleet Utilization Gauge', type: 'gauge' },
]

export default function Dashboard() {
  const [period, setPeriod] = useState('12m')
  const [compare, setCompare] = useState(false)
  const [refreshSeed, setRefreshSeed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [visibleWidgets, setVisibleWidgets] = useLocalStorage('tms-dashboard-widgets', DEFAULT_WIDGET_IDS)
  const { toast } = useToast()

  const metrics = useDashboardMetrics({ period, compare, refreshSeed })

  const overviewCards = dashboardStats.map((stat) => ({
    label: stat.label,
    count: stat.value,
    color: colorMap[stat.color] || stat.color,
    icon: stat.icon,
  }))

  const bookingColumns = [
    { key: 'id', label: 'Booking ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'route', label: 'Route' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'payment', label: 'Payment', render: (r) => <Badge variant={statusVariant(r.payment)}>{r.payment}</Badge> },
  ]

  const tripColumns = [
    { key: 'lr', label: 'LR No.' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'freight', label: 'Freight' },
  ]

  const chartConfigs = useMemo(() => {
    const compareSuffix = compare ? ' · vs prev period' : ''
    return {
      'monthly-revenue': {
        title: 'Monthly Revenue',
        subtitle: `₹ Lakhs · ${metrics.periodLabel}${compareSuffix}`,
        type: 'bar',
        data: metrics.revSlice,
        color: '#2563eb',
        badge: metrics.revChange.text,
        badgePositive: metrics.revChange.positive,
      },
      'monthly-expenses': {
        title: 'Monthly Expenses',
        subtitle: `₹ Lakhs · Operating cost${compareSuffix}`,
        type: 'area',
        data: metrics.expSlice,
        color: '#ef4444',
        badge: metrics.expChange.text,
        badgePositive: !metrics.expChange.positive,
      },
      'profit-multi': {
        title: 'Revenue vs Expense vs Profit',
        subtitle: `Multi-line trend${compareSuffix}`,
        type: 'multiLine',
        data: metrics.profitTrend,
      },
      'revenue-stack': {
        title: 'Revenue & Expense Stack',
        subtitle: `Last ${Math.min(metrics.profitTrend.length, 6)} months`,
        type: 'stacked',
        data: metrics.profitTrend,
      },
      'trip-status': { title: 'Trip Status', subtitle: 'Distribution', type: 'donut', data: metrics.tripAnalysis },
      'payment-mix': { title: 'Payment Status', subtitle: 'Collection mix', type: 'pie', data: metrics.paymentMix },
      'expense-breakdown': { title: 'Expense Breakdown', subtitle: 'By category', type: 'donut', data: metrics.expenseBreakdown },
      'fleet-status': { title: 'Fleet Status', subtitle: 'Vehicle allocation', type: 'pie', data: metrics.fleetStatus },
      'vehicle-util': { title: 'Vehicle Utilization', subtitle: 'Top 5 vehicles', type: 'horizontal', data: metrics.vehicleUtilization },
      'weekly-bookings': { title: 'Weekly Bookings', subtitle: 'This week', type: 'line', data: metrics.weeklyBookings, color: '#8b5cf6' },
      'route-perf': { title: 'Route Performance', subtitle: 'Trip volume score', type: 'bar', data: metrics.routePerformance, color: '#10b981' },
      'top-drivers': { title: 'Top Drivers', subtitle: 'Trips completed', type: 'grouped', data: metrics.driverPerformance },
      'route-radar': { title: 'Route Radar', subtitle: 'Performance index', type: 'radar', data: metrics.routePerformance },
      'fleet-gauge': { title: 'Fleet Utilization Gauge', subtitle: 'Overall fleet efficiency', type: 'gauge', gaugeValue: metrics.fleetGauge },
    }
  }, [metrics, compare])

  const visibleCharts = WIDGET_DEFS.filter((w) => visibleWidgets.includes(w.id)).map((w) => ({
    id: w.id,
    ...chartConfigs[w.id],
  }))

  const handleRefresh = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setRefreshSeed((s) => s + 1)
      setLoading(false)
      toast({ title: 'Dashboard refreshed', message: 'Analytics data updated', type: 'success' })
    }, 800)
  }, [toast])

  const handleExport = useCallback(() => {
    exportJson(
      {
        period,
        compare,
        exportedAt: new Date().toISOString(),
        metrics: {
          revenue: metrics.revSlice,
          expenses: metrics.expSlice,
          profitTrend: metrics.profitTrend,
          kpis: metrics.kpis,
        },
      },
      `tms-analytics-${period}.json`,
    )
    toast({ title: 'Export complete', message: 'Analytics JSON downloaded', type: 'success' })
  }, [period, compare, metrics, toast])

  const toggleWidget = (id) => {
    setVisibleWidgets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="overflow-auto p-2 sm:p-3">
          <AlertsPanel limit={4} />
          <StatusSummaryCards cards={overviewCards} />
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      content: (
        <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
          <AnalyticsFilterBar
            period={period}
            onPeriodChange={setPeriod}
            compare={compare}
            onCompareChange={setCompare}
            onRefresh={handleRefresh}
            onExport={handleExport}
            onCustomize={() => setWidgetOpen(true)}
            loading={loading}
            periodLabel={metrics.periodLabel}
          />
          <div className="grid grid-cols-1 space-y-3 sm:grid-cols-2 sm:space-y-0 xl:grid-cols-3 2xl:grid-cols-4 [&>*]:mb-3">
            {visibleCharts.map((chart) => (
              <AnalyticsChart key={chart.id} {...chart} />
            ))}
          </div>
          {visibleCharts.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-500">
              No widgets selected. Click <strong>Widgets</strong> to customize your dashboard.
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'bookings',
      label: 'Recent Bookings',
      content: (
        <div className="flex h-full min-h-[280px] flex-col p-2 sm:p-3">
          <ERPDataTable fill columns={bookingColumns} data={recentBookings} showActions={false} />
        </div>
      ),
    },
    {
      id: 'trips',
      label: 'Recent Trips',
      content: (
        <div className="flex h-full min-h-[280px] flex-col p-2 sm:p-3">
          <ERPDataTable fill columns={tripColumns} data={recentTrips} showActions={false} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ERPPageTitle module="Dashboard" title="Overview" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-primary/20 bg-white shadow-sm dark:bg-slate-900">
        <Tabs fill tabs={tabs} defaultTab="overview" />
      </div>
      <WidgetPickerModal
        open={widgetOpen}
        onClose={() => setWidgetOpen(false)}
        widgets={WIDGET_DEFS}
        visibleIds={visibleWidgets}
        onToggle={toggleWidget}
        onReset={() => setVisibleWidgets(DEFAULT_WIDGET_IDS)}
        onSelectAll={() => setVisibleWidgets(WIDGET_DEFS.map((w) => w.id))}
        onClearAll={() => setVisibleWidgets([])}
      />
    </div>
  )
}
