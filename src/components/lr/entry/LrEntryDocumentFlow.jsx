import { AlertTriangle, CheckCircle2, Link2 } from 'lucide-react'
import Button from '../../ui/Button'

const FLOW_STEPS = ['Booking', 'LR', 'Dispatch', 'In Transit', 'Delivery', 'POD']

export default function LrEntryDocumentFlow({
  bookingId,
  bookingLabel,
  isBookingRequired,
  onSelectBooking,
  onChangeBooking,
}) {
  const linked = Boolean(bookingId?.trim())

  return (
    <div className="lr-entry-v2-flow shrink-0">
      <div className="lr-entry-v2-flow-steps" aria-label="Document flow">
        {FLOW_STEPS.map((step, i) => (
          <span key={step} className="lr-entry-v2-flow-step-wrap">
            {i > 0 ? <span className="lr-entry-v2-flow-arrow" aria-hidden>→</span> : null}
            <span className={`lr-entry-v2-flow-step ${step === 'LR' ? 'is-current' : ''}`}>{step}</span>
          </span>
        ))}
      </div>

      <div className="lr-entry-v2-flow-booking">
        {linked ? (
          <>
            <span className="lr-entry-v2-flow-linked">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              Booking Linked: <strong>{bookingLabel || bookingId}</strong>
            </span>
            <Button size="sm" variant="outline" type="button" icon={Link2} onClick={onChangeBooking}>
              Change Booking
            </Button>
          </>
        ) : (
          <>
            <span className="lr-entry-v2-flow-unlinked">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              {isBookingRequired ? 'No Booking Linked — required before save' : 'No Booking Linked'}
            </span>
            <Button size="sm" variant="outline" type="button" onClick={onSelectBooking}>
              Select Booking
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
