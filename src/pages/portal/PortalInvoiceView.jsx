import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../components/ui/ReportFilters'
import PrintCompanyHeader from '../../components/print/PrintCompanyHeader'
import { portalApi } from '../../services/api'

export default function PortalInvoiceView() {
  const { id } = useParams()
  const printRef = useRef(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    portalApi.invoice(id).then(setData)
  }, [id])

  const print = () => window.print()

  if (!data) return <p className="text-sm text-slate-500">Loading invoice…</p>

  const { invoice, company } = data

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <Link to="/portal/invoices" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Link>
        <Button size="sm" icon={Printer} onClick={print} className="ml-auto">Print / Save PDF</Button>
      </div>

      <div ref={printRef} className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <PrintCompanyHeader company={company} documentTitle="Tax Invoice" documentSubtitle={invoice.invoiceNo} />

        <div className="mb-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-semibold">Bill To</p>
            <p>{invoice.customer?.name}</p>
            {invoice.customer?.gst && <p>GSTIN: {invoice.customer.gst}</p>}
            {invoice.customer?.address && <p className="text-slate-600">{invoice.customer.address}</p>}
          </div>
          <div className="sm:text-right">
            <p><span className="text-slate-500">Issue date:</span> {invoice.issuedAt}</p>
            {invoice.dueAt && <p><span className="text-slate-500">Due:</span> {invoice.dueAt}</p>}
            {invoice.bookingId && <p><span className="text-slate-500">Booking:</span> {invoice.bookingId}</p>}
            <p><span className="text-slate-500">Status:</span> {invoice.status}</p>
          </div>
        </div>

        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines ?? []).map((line) => (
              <tr key={line.id} className="border-b border-slate-100">
                <td className="py-2">{line.description}</td>
                <td className="py-2 text-right">{line.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                <td className="py-2 text-right">{formatCurrency(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoice.amount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
        </div>
      </div>
    </div>
  )
}
