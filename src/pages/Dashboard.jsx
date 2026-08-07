import { useCallback, useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import DashboardKpiRow, { DashboardQuickActions } from '../components/dashboard/DashboardWidgets'
import { DashboardChartsRow, DashboardTablesRow } from '../components/dashboard/DashboardTables'
import DashboardLegacyTabs from '../components/dashboard/DashboardLegacyTabs'
import { useDashboardHome } from '../hooks/useDashboardHome'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [refreshSeed, setRefreshSeed] = useState(0)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const home = useDashboardHome(refreshSeed)

  const handleRefresh = useCallback(async () => {
    await home.refresh()
    setRefreshSeed((s) => s + 1)
    toast({ title: 'Dashboard refreshed', type: 'success' })
  }, [home, toast])

  return (
    <div className="flex min-h-full flex-col space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back, {user?.name ?? 'User'}!
          </p>
        </div>
        <div className="flex gap-2">
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

      <DashboardQuickActions />

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
