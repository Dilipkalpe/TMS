import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { shipmentManagementCards } from '../../config/shipmentManagementHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function ShipmentManagementHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Shipment Management" title="Shipment Management">
      <HubCardGrid
        cards={shipmentManagementCards}
        canAccessPath={canAccessPath}
        iconFallback="Package"
        columns="lg"
      />
    </ERPContentPage>
  )
}
