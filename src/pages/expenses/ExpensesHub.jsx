import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { expensesCards } from '../../config/expensesHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function ExpensesHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Expenses" title="Expenses">
      <HubCardGrid
        cards={expensesCards}
        canAccessPath={canAccessPath}
        iconFallback="Wallet"
        columns="lg"
      />
    </ERPContentPage>
  )
}
