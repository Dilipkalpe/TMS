import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { mastersCards } from '../../config/mastersHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function MastersHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Masters"
      title="Masters"
      eyebrow="Master data"
      headline="Party, fleet & rate masters"
      description="Maintain the registers that drive LR entry, billing, and operations."
      quickActions={[
        { label: 'New vehicle', path: '/vehicles/new', variant: 'accent' },
        { label: 'Customers', path: '/customers', variant: 'ghost' },
        { label: 'Freight rates', path: '/freight-rates', variant: 'ghost' },
      ]}
      cards={mastersCards}
      canAccessPath={canAccessPath}
      iconFallback="Database"
      columns="lg"
    />
  )
}
