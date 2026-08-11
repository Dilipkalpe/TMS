import CommandCenterHub from '../../components/ui/CommandCenterHub'
import { settingsHubSections } from '../../config/settingsHub'
import { useSubscription } from '../../context/SubscriptionContext'

export default function SettingsHub() {
  const { canAccessPath } = useSubscription()

  return (
    <CommandCenterHub
      module="Settings"
      title="Settings"
      eyebrow="Configuration"
      headline="Company setup & access"
      description="Configure company profile, users, branches, numbering, and channels."
      quickActions={[
        { label: 'General settings', path: '/settings/general', variant: 'accent' },
        { label: 'Staff users', path: '/settings/users', variant: 'ghost' },
        { label: 'Print templates', path: '/settings/print-templates', variant: 'ghost' },
      ]}
      sections={settingsHubSections}
      canAccessPath={canAccessPath}
      iconFallback="Settings"
      columns="lg"
    />
  )
}
