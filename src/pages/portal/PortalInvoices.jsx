import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText } from 'lucide-react'
import Card from '../../components/ui/Card'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { portalApi } from '../../services/api'
import { PortalEmptyState } from './PortalLayout'

export default function PortalInvoices() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalApi.invoices().then(setRows).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-slate-500">Loading invoices…</p>
  if (!rows.length) return <PortalEmptyState icon={FileText} title="No invoices">Invoices linked to your account will appear here.</PortalEmptyState>

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Invoices</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-2 text-left">Invoice</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-2 font-medium">{inv.invoiceNo}</td>
                <td className="px-4 py-2">{inv.issuedAt}</td>
                <td className="px-4 py-2">{inv.status}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(inv.totalAmount)}</td>
                <td className="px-4 py-2 text-right">
                  <Link to={`/portal/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Download className="h-3.5 w-3.5" /> View / Print
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
