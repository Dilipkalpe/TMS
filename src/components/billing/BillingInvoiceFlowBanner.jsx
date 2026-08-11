import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Bill / Invoice List', path: '/operations/billing/list' },
  { id: 2, label: 'Select Unbilled LR', path: '/operations/billing/invoice' },
  { id: 3, label: 'New Billing Invoice', path: '/operations/billing/invoice' },
  { id: 4, label: 'Save & Print', path: null },
]

export default function BillingInvoiceFlowBanner({ currentStep = 1, lrNumber = '' }) {
  return (
    <div className="billing-flow-banner shrink-0">
      <p className="billing-flow-banner-title">Billing Invoice Flow</p>
      <div className="billing-flow-steps">
        {STEPS.map((step, i) => {
          const done = step.id < currentStep
          const active = step.id === currentStep
          return (
            <div key={step.id} className="billing-flow-step-wrap">
              {i > 0 && <ArrowRight className="billing-flow-arrow h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
              <div className={`billing-flow-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                <span>{step.label}</span>
              </div>
            </div>
          )
        })}
      </div>
      {currentStep === 2 && (
        <p className="billing-flow-hint">
          Click <strong>Invoice</strong> or a row below to open the New Billing Invoice form for that LR.
        </p>
      )}
      {currentStep === 3 && lrNumber && (
        <p className="billing-flow-hint">
          Creating invoice for <strong>{lrNumber}</strong> — complete all sections, then Save or Save &amp; Print.
        </p>
      )}
    </div>
  )
}
