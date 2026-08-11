import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { expensesCards } from '../../config/expensesHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function ExpensesHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Expenses"
      title="Expenses"
      eyebrow="Cost control"
      headline="Trip & company expenses"
      description="Record trip-linked costs, approve pending expenses, and manage general company spend."
      quickActions={[
        { label: 'Trip expenses', path: '/operations/trip-expenses/list', variant: 'accent' },
        { label: 'Approvals', path: '/lr/expense-approval', variant: 'ghost' },
        { label: 'General expenses', path: '/expenses/management', variant: 'ghost' },
      ]}
      cards={expensesCards}
      canAccessPath={canAccessPath}
      iconFallback="Wallet"
      columns="lg"
    />
  )
}
