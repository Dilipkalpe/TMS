import { withHubTheme } from './hubTheme'

export const expensesCards = withHubTheme([
  {
    title: 'Trip Expenses',
    path: '/operations/trip-expenses/list',
    icon: 'Truck',
    description: 'LR / trip-linked expenses (diesel, toll, bhatta, loading) recorded against consignments',
    tone: 'amber',
    chip: 'Trip',
  },
  {
    title: 'Expense Approval',
    path: '/lr/expense-approval',
    icon: 'BadgeCheck',
    description: 'Approve pending LR and trip expenses before closing',
    tone: 'emerald',
    chip: 'Approve',
  },
  {
    title: 'Expense Management',
    path: '/expenses/management',
    icon: 'Wallet',
    description: 'General company expenses (fuel, toll, office, maintenance) not tied to a single LR',
    tone: 'blue',
    chip: 'General',
  },
])
