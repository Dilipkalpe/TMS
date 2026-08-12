import { hubSection, withHubTheme } from './hubTheme'

export const settingsCards = withHubTheme([
  { title: 'General', path: '/settings/general', icon: 'Settings', description: 'Company profile, theme, print logo, and document flow' },
  { title: 'Document print templates', path: '/settings/print-templates', icon: 'Printer', description: 'Customize LR, invoice, and document print layouts' },
  { title: 'Staff users', path: '/settings/users', icon: 'Users', description: 'Staff accounts, User Role Type, and branch access' },
  { title: 'User role types', path: '/settings/role-menus', icon: 'Shield', description: 'Provision role types and show/hide menus per User Role Type' },
  { title: 'Portal user access', path: '/settings/portal-users', icon: 'UserCircle', description: 'Customer portal login and permissions' },
  { title: 'Branch locations', path: '/settings/branches', icon: 'GitBranch', description: 'Branch master and isolation settings' },
  { title: 'Document numbering', path: '/settings/document-numbering', icon: 'Hash', description: 'Number series for LR, invoices, and vouchers' },
  { title: 'SMS & WhatsApp', path: '/settings/notifications', icon: 'Bell', description: 'Notification channels and templates' },
  { title: 'Data cleanup', path: '/settings/data-cleanup', icon: 'Trash2', description: 'Delete transaction & master data; keep configuration' },
])

const byPath = Object.fromEntries(settingsCards.map((c) => [c.path, c]))
const pick = (...paths) => paths.map((p) => byPath[p]).filter(Boolean)

export const settingsHubSections = [
  hubSection('Company & documents', 'Profile, print templates, and numbering', pick(
    '/settings/general',
    '/settings/print-templates',
    '/settings/document-numbering',
  ), { chip: 'Setup' }),
  hubSection('Users & branches', 'Access control and locations', pick(
    '/settings/users',
    '/settings/role-menus',
    '/settings/portal-users',
    '/settings/branches',
  ), { chip: 'Access' }),
  hubSection('Channels & data', 'Notifications and cleanup tools', pick(
    '/settings/notifications',
    '/settings/data-cleanup',
  ), { chip: 'Tools' }),
]
