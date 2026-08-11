import { useCallback, useMemo, useState } from 'react'
import { Filter, RefreshCw, Settings2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import SlideDrawer from '../components/ui/SlideDrawer'
import ERPPageTitle from '../components/ui/ERPPageTitle'
import DashboardKpiRow, { DashboardQuickActions } from '../components/dashboard/DashboardWidgets'
import { DashboardChartsRow, DashboardTablesRow } from '../components/dashboard/DashboardTables'
import DashboardLegacyTabs from '../components/dashboard/DashboardLegacyTabs'
import { useDashboardHome } from '../hooks/useDashboardHome'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { defaultDashboardDateRange, formatDashboardRangeLabel } from '../utils/dashboardDateRange'

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [refreshSeed, setRefreshSeed] = useState(0)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState(() => defaultDashboardDateRange())
  const [draftFilters, setDraftFilters] = useState(() => defaultDashboardDateRange())

  const { loadMs, ...home } = useDashboardHome({
    dateFrom: appliedFilters.dateFrom,
    dateTo: appliedFilters.dateTo,
    refreshSeed,
  })

  const rangeLabel = useMemo(
    () => formatDashboardRangeLabel(appliedFilters.dateFrom, appliedFilters.dateTo),
    [appliedFilters],
  )

  const openFilterDrawer = useCallback(() => {
    setDraftFilters({ ...appliedFilters })
    setFilterOpen(true)
  }, [appliedFilters])

  const applyFilters = useCallback(() => {
    if (draftFilters.dateFrom && draftFilters.dateTo && draftFilters.dateFrom > draftFilters.dateTo) {
      toast({ title: 'Invalid dates', message: 'From date must be on or before To date.', type: 'warning' })
      return
    }
    setAppliedFilters({ ...draftFilters })
    setFilterOpen(false)
  }, [draftFilters, toast])

  const resetFilters = useCallback(() => {
    const defaults = defaultDashboardDateRange()
    setDraftFilters(defaults)
    setAppliedFilters(defaults)
    setFilterOpen(false)
  }, [])

  const handleRefresh = useCallback(async () => {
    await home.refresh()
    setRefreshSeed((s) => s + 1)
    toast({ title: 'Dashboard refreshed', type: 'success' })
  }, [home, toast])

  return (
    <div className="flex min-h-full flex-col space-y-4">
      <ERPPageTitle module="Dashboard" title="Overview" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Welcome back, {user?.name ?? 'User'}!
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Showing data for {rangeLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Filter} onClick={openFilterDrawer}>
            Filter
          </Button>
          <Button variant="outline" icon={Settings2} onClick={() => setCustomizeOpen(true)}>
            Customize
          </Button>
          <Button icon={RefreshCw} onClick={handleRefresh} disabled={home.loading}>
            Refresh
          </Button>
        </div>
      </div>

      {home.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{home.error}</p>
      )}

      <DashboardQuickActions />

      <DashboardKpiRow kpis={home.data?.kpis ?? []} loading={home.loading} />

      <DashboardChartsRow
        lrTrend={home.data?.lrTrend ?? []}
        lrStatusSummary={home.data?.lrStatusSummary ?? []}
        lrStatusTotal={home.data?.lrStatusTotal ?? 0}
        topDestinations={home.data?.topDestinations ?? []}
        loading={home.loading}
      />

      <DashboardTablesRow
        recentLrs={home.data?.recentLrs ?? []}
        pendingDeliveries={home.data?.pendingDeliveries ?? []}
        notifications={home.data?.notifications ?? []}
        loading={home.loading}
      />

      {loadMs != null && !home.loading && (
        <p className="text-center text-[11px] text-slate-400">
          Loaded in {loadMs < 1000 ? `${loadMs} ms` : `${(loadMs / 1000).toFixed(1)} s`}
        </p>
      )}

      <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Dashboard Filter" width="md">
        <p className="mb-3 text-sm text-slate-500">
          Default is the last 30 days for fast loading. KPIs and charts use this range; Recent LR still shows the latest records.
        </p>
        <div className="grid gap-3">
          <Input
            label="From Date"
            type="date"
            value={draftFilters.dateFrom}
            onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <Input
            label="To Date"
            type="date"
            value={draftFilters.dateTo}
            onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          <Button onClick={applyFilters}>Apply</Button>
          <Button variant="outline" onClick={resetFilters}>Reset (30 days)</Button>
        </div>
      </SlideDrawer>

      <Modal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Dashboard Customization"
        size="xl"
      >
        <p className="mb-3 text-sm text-slate-500">
          Full analytics, branch-wise KPIs, and widget picker — all preserved from the previous dashboard.
        </p>
        <DashboardLegacyTabs refreshSeed={refreshSeed} />
      </Modal>
    </div>
  )
}
