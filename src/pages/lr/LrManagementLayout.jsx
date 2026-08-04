import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LrStatusFlow from '../../components/lr/LrStatusFlow'
import { LR_WORKFLOW_TABS } from '../../constants/lrWorkflowTabs'
import { lrOperationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Plus } from 'lucide-react'

export default function LrManagementLayout() {
  const { toast } = useToast()
  const { pathname } = useLocation()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    lrOperationsApi.summary()
      .then((res) => setCounts(res.counts ?? {}))
      .catch((e) => toast({ title: 'Counts unavailable', message: e.message, type: 'warning' }))
  }, [pathname, toast])

  return (
    <ERPContentPage
      module="LR Management"
      title="LR Management"
      toolbar={(
        <Link to="/lr/generate">
          <Button icon={Plus}>Create LR</Button>
        </Link>
      )}
    >
      <Card className="mb-4 border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
        <LrStatusFlow highlightCurrent={false} layout="horizontal" />
      </Card>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {LR_WORKFLOW_TABS.map((tab) => {
          const count = counts[tab.stage]
          const isIndex = tab.path === '/lr'
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              end={isIndex}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-sm ${
                  isActive
                    ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
                }`
              }
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
                  {count}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>

      <Outlet />
    </ERPContentPage>
  )
}
