import { withHubTheme } from './hubTheme'
import { hrCards as rawHrCards } from './hrHub'
import { payrollCards as rawPayrollCards } from './payrollHub'

export const hrCards = withHubTheme(rawHrCards, { chip: 'HR' })
export const payrollCards = withHubTheme(rawPayrollCards, { chip: 'Pay' })

export const hrPayrollHubSections = [
  {
    title: 'HR',
    description: 'Employees, attendance, leave, and organization setup.',
    cards: hrCards,
  },
  {
    title: 'Payroll',
    description: 'Payroll runs, payslips, salary register, and payroll settings.',
    cards: payrollCards,
  },
]
