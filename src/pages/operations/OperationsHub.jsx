import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { operationsHubSections } from '../../config/operationsHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function OperationsHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Operations" title="Operations">
      <HubCardGrid
        sections={operationsHubSections}
        canAccessPath={canAccessPath}
        iconFallback="Layers"
        columns="lg"
      />
    </ERPContentPage>
  )
}
