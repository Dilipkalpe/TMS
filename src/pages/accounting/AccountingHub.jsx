import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import { accountingCards } from '../../data/accountingHub'

export default function AccountingHub() {
  return (
    <ERPContentPage module="Accounting" title="Accounting Hub">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accountingCards.map((item) => {
          const Icon = Icons[item.icon] || Icons.Calculator
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
    </ERPContentPage>
  )
}
