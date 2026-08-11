import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'

export default function BillingExistingInvoiceAlert({ invoice }) {
  if (!invoice?.id && !invoice?.Id) return null
  const id = invoice.id || invoice.Id
  const no = invoice.invoiceNo || invoice.InvoiceNo

  return (
    <div className="billing-v2-existing-alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-100">Invoice already exists for this LR</p>
        <p className="text-sm text-amber-800/90 dark:text-amber-200/90">
          Active invoice <strong>{no}</strong> — duplicate billing is blocked. View or print from accounting.
        </p>
      </div>
      <Link to={`/accounting/freight-invoices/${id}`}>
        <Button size="sm" variant="outline" type="button">View Invoice</Button>
      </Link>
    </div>
  )
}
