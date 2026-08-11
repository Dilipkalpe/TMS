import { formatCurrency } from '../../ui/ReportFilters'

function FinItem({ label, value, highlight = false }) {
  return (
    <span className={`lr-entry-v2-fin-item${highlight ? ' is-highlight' : ''}`}>
      <span className="lr-entry-v2-fin-label">{label}</span>
      <span className="lr-entry-v2-fin-value">{value}</span>
    </span>
  )
}

export default function LrEntryFinancialSummary({
  subTotal,
  taxable,
  gstAmount,
  totalAmount,
  balance,
}) {
  return (
    <div className="lr-entry-v2-financial-summary" aria-label="Financial summary">
      <FinItem label="Sub Total" value={formatCurrency(subTotal)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <FinItem label="Taxable" value={formatCurrency(taxable)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <FinItem label="GST" value={formatCurrency(gstAmount)} />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <FinItem label="Grand Total" value={formatCurrency(totalAmount)} highlight />
      <span className="lr-entry-v2-fin-divider" aria-hidden="true">|</span>
      <FinItem label="Balance Due" value={formatCurrency(balance)} highlight />
    </div>
  )
}
