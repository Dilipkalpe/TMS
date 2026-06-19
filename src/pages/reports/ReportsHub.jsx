import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import { reportCards } from '../../data/reports'

export default function ReportsHub() {
  return (
    <ERPContentPage module="Reports" title="Reports Hub">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reportCards.map((report) => {
          const Icon = Icons[report.icon] || Icons.FileText
          return (
            <Link key={report.path} to={report.path}>
              <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{report.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{report.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </ERPContentPage>
  )
}
