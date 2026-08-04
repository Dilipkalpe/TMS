import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import { LR_OPERATION_MENUS } from '../../../constants/lrOperationsMenus'
import { lrOperationsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'

export default function LrOperationsHub() {
  const { toast } = useToast()
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    lrOperationsApi.summary()
      .then((res) => setCounts(res.counts ?? {}))
      .catch((e) => toast({ title: 'Could not load pending counts', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])

  const totalPending = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-slate-900">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">LR Transaction Processing</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Each desk shows only pending work for that step. Open a queue, pick an LR, and continue from where the previous stage left off — no need to open the full LR record first.
        </p>
        <p className="mt-3 text-sm font-medium text-violet-700 dark:text-violet-300">
          {loading ? 'Loading pending counts…' : `${totalPending} item${totalPending === 1 ? '' : 's'} pending across all desks`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LR_OPERATION_MENUS.map((item) => {
          const Icon = Icons[item.icon] || Icons.Layers
          const count = counts[item.stage] ?? 0
          return (
            <Link key={item.path} to={item.path}>
              <Card className="relative h-full transition-all hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  {!loading && (
                    <Badge variant={count > 0 ? 'Pending' : 'Paid'} className="shrink-0">
                      {count} pending
                    </Badge>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
