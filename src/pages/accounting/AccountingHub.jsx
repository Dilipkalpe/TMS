import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { accountingHubSections } from '../../config/accountingHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function AccountingHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Accounting"
      title="Accounting Hub"
      eyebrow="Finance"
      headline="Books, ledgers & statements"
      description="Post vouchers, review ledgers, and close the period with trial balance, P&L, and balance sheet."
      quickActions={[
        { label: 'Voucher entry', path: '/accounting/voucher-entry', variant: 'accent' },
        { label: 'Outstanding', path: '/accounting/outstanding', variant: 'ghost' },
        { label: 'Trial balance', path: '/accounting/trial-balance', variant: 'ghost' },
      ]}
      sections={accountingHubSections}
      canAccessPath={canAccessPath}
      iconFallback="Calculator"
      columns="xl"
    />
  )
}
