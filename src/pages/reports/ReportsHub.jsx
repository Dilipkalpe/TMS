import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { reportCards } from '../../config/reportsHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function ReportsHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Reports" title="Reports Hub">
      <HubCardGrid cards={reportCards} canAccessPath={canAccessPath} iconFallback="FileText" />
    </ERPContentPage>
  )
}
