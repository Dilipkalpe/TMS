import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { deliveryManagementCards } from '../../config/deliveryManagementHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function DeliveryManagementHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Delivery Management"
      title="Delivery Management"
      eyebrow="Inbound flow"
      headline="Transit → delivery → POD"
      description="Track consignments on the road, complete delivery, and capture proof of delivery."
      quickActions={[
        { label: 'In transit', path: '/operations/in-transit/list', variant: 'accent' },
        { label: 'Delivery complete', path: '/operations/delivery-complete/list', variant: 'ghost' },
        { label: 'POD desk', path: '/operations/delivery/pod/list', variant: 'ghost' },
      ]}
      cards={deliveryManagementCards}
      canAccessPath={canAccessPath}
      iconFallback="PackageCheck"
      columns="lg"
    />
  )
}
