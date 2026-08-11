import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { mastersCards } from '../../config/mastersHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function MastersHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Masters" title="Masters">
      <HubCardGrid cards={mastersCards} canAccessPath={canAccessPath} iconFallback="Database" />
    </ERPContentPage>
  )
}
