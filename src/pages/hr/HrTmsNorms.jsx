import { Link } from 'react-router-dom'
import { Truck, Shield, Fuel, Route, HardHat, FileText } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'

const TMS_NORMS = [
  {
    icon: Truck,
    title: 'Driver Payroll (Permanent / Contract)',
    items: [
      'Monthly basic salary + HRA/DA/conveyance',
      'Trip incentive: configurable ₹/trip (max cap)',
      'Route allowance: fixed monthly route pay',
      'Fuel allowance: per completed trip + optional fixed amount',
      'Driver bhatta (DA): daily road allowance × attendance days',
      'Halting/demurrage share: per trip',
      'Safety bonus: flat monthly if eligible',
      'PF, ESI (if gross ≤ ceiling), insurance, professional tax',
    ],
  },
  {
    icon: HardHat,
    title: 'Loader / Warehouse Staff',
    items: [
      'Loading/unloading allowance (monthly)',
      'Daily workers: wage × present days from attendance',
      'Contract: reduced statutory (no ESI by default)',
    ],
  },
  {
    icon: Route,
    title: 'Fleet & Compliance',
    items: [
      'Link employee to driver ID and assigned vehicle',
      'Driving license number & expiry tracked on employee profile',
      'License expiry alert days configurable in Payroll Settings',
      'Trip count from driver master drives fuel & trip bonus',
    ],
  },
  {
    icon: Shield,
    title: 'Statutory (India Transport Norms)',
    items: [
      'Permanent: PF 12%, ESI 0.75%, group insurance, PT',
      'Contract: insurance + optional PF; PT if gross ≥ ₹15,000',
      'Daily: insurance per day worked; no PF/ESI by default',
    ],
  },
  {
    icon: Fuel,
    title: 'Payroll Settings (TMS)',
    items: [
      'Route allowance default, fuel per trip, loading allowance',
      'Halting allowance per trip, driver bhatta per day',
      'Safety bonus, license expiry alert days',
      'Configure under Payroll → Payroll Settings',
    ],
  },
  {
    icon: FileText,
    title: 'Payslips & Accounting',
    items: [
      'TMS allowances shown as separate line on payslip',
      'Company logo on payslip from Settings upload',
      'Mark Paid posts payment voucher + PF journal to accounting',
    ],
  },
]

export default function HrTmsNorms() {
  return (
    <ERPContentPage module="HR" title="TMS Transport — HR & Payroll Norms">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Specifications for transport/logistics workforce: drivers, loaders, mechanics, and office staff.
        Allowances are applied automatically when payroll is generated.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {TMS_NORMS.map(({ icon: Icon, title, items }) => (
          <Card key={title}>
            <CardHeader title={title} />
            <ul className="list-disc space-y-1.5 px-4 pb-4 pl-8 text-sm text-slate-600 dark:text-slate-400">
              {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <Link to="/payroll/settings" className="text-sm font-medium text-primary hover:underline">Payroll Settings →</Link>
        <Link to="/settings" className="text-sm font-medium text-primary hover:underline">Company Logo & Profile →</Link>
      </div>
    </ERPContentPage>
  )
}
