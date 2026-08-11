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
      description="Analyze trips, fleet, customers, cash flow, and accounting statements from one place."
      quickActions={[
        { label: 'Trip report', path: '/reports/trips', variant: 'accent' },
        { label: 'Cash flow', path: '/reports/cash-flow', variant: 'ghost' },
        { label: 'P&L', path: '/accounting/profit-loss', variant: 'ghost' },
      ]}
      sections={reportsHubSections}
      canAccessPath={canAccessPath}
      iconFallback="FileText"
      columns="xl"
    />
  )
}
