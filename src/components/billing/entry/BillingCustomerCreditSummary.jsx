import { formatCurrency } from '../../ui/ReportFilters'

export default function BillingCustomerCreditSummary({ credit }) {
  if (!credit?.customerName) return null

  const available = Math.max(0, Number(credit.creditLimit || 0) - Number(credit.outstanding || 0))

  return (
    <div className="billing-v2-credit">
      <p className="billing-v2-credit-title">Customer Credit Summary — {credit.customerName}</p>
      <div className="billing-v2-credit-grid">
        <div className="billing-v2-credit-item">
          <span>Credit Limit</span>
          <strong>{formatCurrency(credit.creditLimit)}</strong>
        </div>
        <div className="billing-v2-credit-item">
          <span>Current Outstanding</span>
          <strong>{formatCurrency(credit.outstanding)}</strong>
        </div>
        <div className="billing-v2-credit-item billing-v2-credit-item--warn">
          <span>Overdue Amount</span>
          <strong>{formatCurrency(credit.overdue ?? 0)}</strong>
        </div>
        <div className="billing-v2-credit-item billing-v2-credit-item--ok">
          <span>Available Credit</span>
          <strong>{formatCurrency(available)}</strong>
        </div>
      </div>
    </div>
  )
}
