import { useCallback, useMemo, useState } from 'react'
import StatusSummaryCards from '../ui/StatusSummaryCards'
import AnalyticsChart from '../ui/AnalyticsChart'
import ERPDataTable from '../ui/ERPDataTable'
import Card, { CardHeader } from '../ui/Card'
import Tabs from '../ui/Tabs'
import Badge, { statusVariant } from '../ui/Badge'
import AnalyticsFilterBar from './AnalyticsFilterBar'
import WidgetPickerModal from './WidgetPickerModal'
import { useDashboardMetrics, useDashboardRecent, DEFAULT_WIDGET_IDS } from '../../hooks/useDashboardMetrics'
import { useDashboardOverview } from '../../hooks/useDashboardOverview'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useToast } from '../../context/ToastContext'
import { exportJson } from '../../utils/export'
import { formatCurrency } from '../ui/ReportFilters'
import { TMS_COLORS } from '../../config/theme'

const colorMap = {
  indigo: 'violet', cyan: 'blue', emerald: 'green', amber: 'amber',
  orange: 'orange', green: 'green', red: 'red', slate: 'slate', violet: 'violet', blue: 'blue',
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

/** Legacy tabbed dashboard — branch-wise, analytics widgets, recent bookings/trips. */
export default function DashboardLegacyTabs({ refreshSeed = 0 }) {
  const [period, setPeriod] = useState('12m')
  const [compare, setCompare] = useState(false)
  const [loading, setLoading] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [visibleWidgets, setVisibleWidgets] = useLocalStorage('tms-dashboard-widgets', DEFAULT_WIDGET_IDS)
  const { toast } = useToast()

  const overview = useDashboardOverview(refreshSeed)
  const metrics = useDashboardMetrics({ period, compare, refreshSeed })
  const { trips: recentTrips } = useDashboardRecent(refreshSeed)

  const overviewCards = overview.kpiCards.map((stat) => ({
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

  const branchColumns = [
    { key: 'branchName', label: 'Branch', render: (r) => `${r.branchCode} — ${r.branchName}` },
    { key: 'bookings', label: 'Bookings' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
    { key: 'delivered', label: 'Delivered' },
    { key: 'pendingDelivery', label: 'Pending' },
  ]

  const tripColumns = [
    { key: 'lr', label: 'LR No.' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'freight', label: 'Freight' },
  ]

  const chartConfigs = useMemo(() => ({
    'monthly-revenue': { title: 'Monthly Revenue', type: 'bar', data: metrics.revSlice, color: TMS_COLORS.primary },
    'trip-status': { title: 'Trip Status', type: 'donut', data: metrics.tripAnalysis },
    'weekly-bookings': { title: 'Weekly Bookings', type: 'line', data: metrics.weeklyBookings, color: '#8b5cf6' },
    'fleet-gauge': { title: 'Fleet Gauge', type: 'gauge', gaugeValue: metrics.fleetGauge },
  }), [metrics])

  const visibleCharts = WIDGET_DEFS.filter((w) => visibleWidgets.includes(w.id)).map((w) => ({
    id: w.id,
    ...(chartConfigs[w.id] ?? { title: w.title, type: w.type, data: [] }),
  }))

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([overview.refresh(), metrics.refresh()])
    setLoading(false)
  }, [metrics, overview])

  const tabs = [
    {
      id: 'overview',
      label: 'All KPIs',
      content: (
        <div className="space-y-4 p-3">
          <StatusSummaryCards cards={overviewCards} />
        </div>
      ),
    },
    {
      id: 'branch-wise',
      label: 'Branch Wise',
      content: (
        <div className="space-y-4 p-3">
          <ERPDataTable columns={branchColumns} data={overview.branchSummary} showActions={false} />
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      content: (
        <div className="p-3">
          <AnalyticsFilterBar
            period={period}
            onPeriodChange={setPeriod}
            compare={compare}
            onCompareChange={setCompare}
            onRefresh={handleRefresh}
            onExport={() => exportJson({ overview: overview.data }, 'tms-analytics.json')}
            onCustomize={() => setWidgetOpen(true)}
            loading={loading || metrics.loading}
            periodLabel={metrics.periodLabel}
          />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCharts.map((chart) => (
              <AnalyticsChart key={chart.id} {...chart} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'bookings',
      label: 'Recent Bookings',
      content: <div className="p-3"><ERPDataTable columns={bookingColumns} data={overview.recentBookings} showActions={false} /></div>,
    },
    {
      id: 'trips',
      label: 'Recent Trips',
      content: <div className="p-3"><ERPDataTable columns={tripColumns} data={recentTrips} showActions={false} /></div>,
    },
  ]

  return (
    <>
      <Tabs tabs={tabs} defaultTab="overview" />
      <WidgetPickerModal
        open={widgetOpen}
        onClose={() => setWidgetOpen(false)}
        widgets={WIDGET_DEFS}
        visibleIds={visibleWidgets}
        onToggle={(id) => setVisibleWidgets((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
        onReset={() => setVisibleWidgets(DEFAULT_WIDGET_IDS)}
        onSelectAll={() => setVisibleWidgets(WIDGET_DEFS.map((w) => w.id))}
        onClearAll={() => setVisibleWidgets([])}
      />
    </>
  )
}
