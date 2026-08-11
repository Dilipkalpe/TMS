import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { accountingCards } from '../../config/accountingHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function AccountingHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Accounting" title="Accounting Hub">
      <HubCardGrid cards={accountingCards} canAccessPath={canAccessPath} iconFallback="Calculator" />
    </ERPContentPage>
  )
}
