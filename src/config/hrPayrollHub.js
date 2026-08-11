import { hrCards } from './hrHub'
import { payrollCards } from './payrollHub'

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
