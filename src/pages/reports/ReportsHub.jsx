import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { reportsHubSections } from '../../config/reportsHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function ReportsHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Reports"
      title="Reports Hub"
      eyebrow="Insights"
      headline="Operational & finance reports"
      description="Supports Booking→LR and Direct LR workflows — ops flow reports plus matching finance P&L."
      quickActions={[
        { label: 'LR register', path: '/reports/trips', variant: 'accent' },
        { label: 'Booking P&L', path: '/reports/booking-pl', variant: 'ghost' },
        { label: 'Direct LR P&L', path: '/reports/direct-lr-pl', variant: 'ghost' },
      ]}
      sections={reportsHubSections}
      canAccessPath={canAccessPath}
      iconFallback="FileText"
      columns="xl"
    />
  )
}
