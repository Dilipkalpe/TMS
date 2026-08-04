import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { operationsCards } from '../../config/operationsHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function OperationsHub() {
  const { canAccessPath } = useSubscription()
  const cards = operationsCards.filter((item) => canAccessPath(item.path))

  return (
    <ERPContentPage module="Operations" title="Operations">
      <Card className="mb-6 border-violet-200 bg-violet-50/50 p-5 dark:border-violet-900 dark:bg-violet-950/20">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">LR workflow moved</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          LR transaction processing (loading, transit pass, delivery, invoice, expenses) is now under LR Management with workflow tabs.
        </p>
        <Link to="/lr" className="mt-3 inline-block">
          <Button>Open LR Management</Button>
        </Link>
      </Card>

      <div className="border-t border-slate-200 pt-8 dark:border-slate-700">
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Enterprise Modules</h2>
        <p className="mb-4 text-sm text-slate-500">GPS, fuel, ePOD, finance, analytics, and extended TMS capabilities.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => {
            const Icon = Icons[item.icon] || Icons.Layers
            return (
              <Link key={item.path} to={item.path}>
                <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </ERPContentPage>
  )
}
