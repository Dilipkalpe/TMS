import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { deliveryManagementCards } from '../../config/deliveryManagementHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function DeliveryManagementHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Delivery Management" title="Delivery Management">
      <HubCardGrid
        cards={deliveryManagementCards}
        canAccessPath={canAccessPath}
        iconFallback="PackageCheck"
        columns="lg"
      />
    </ERPContentPage>
  )
}
