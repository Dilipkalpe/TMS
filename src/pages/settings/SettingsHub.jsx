import ERPContentPage from '../../components/ui/ERPContentPage'
import HubCardGrid from '../../components/ui/HubCardGrid'
import { settingsCards } from '../../config/settingsHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function SettingsHub() {
  const { canAccessPath } = useSubscription()

  return (
    <ERPContentPage module="Settings" title="Settings">
      <HubCardGrid cards={settingsCards} canAccessPath={canAccessPath} iconFallback="Settings" />
    </ERPContentPage>
  )
}
