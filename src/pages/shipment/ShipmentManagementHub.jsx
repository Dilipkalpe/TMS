import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { shipmentManagementCards } from '../../config/shipmentManagementHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function ShipmentManagementHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Shipment Management"
      title="Shipment Management"
      eyebrow="Outbound flow"
      headline="Quote → book → load → dispatch"
      description="Move consignments from quotation through loading slip, transit pass, and dispatch."
      quickActions={[
        { label: 'LR List', path: '/lr/list', variant: 'accent' },
        { label: 'New booking', path: '/bookings/new', variant: 'ghost' },
        { label: 'Loading slip', path: '/operations/loading-slip/list', variant: 'ghost' },
      ]}
      cards={shipmentManagementCards}
      canAccessPath={canAccessPath}
      iconFallback="Package"
      columns="lg"
    />
  )
}
