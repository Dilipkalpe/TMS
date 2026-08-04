import QuotationList from '../quotations/QuotationList'
import BookingList from './BookingList'

export function BookingQuotationsTab() {
  return <QuotationList embedded />
}

export function BookingPendingTab() {
  return <BookingList embedded defaultStatus="Pending" />
}

export function BookingConfirmedTab() {
  return <BookingList embedded defaultStatus="Confirmed" />
}

export function BookingCancelledTab() {
  return <BookingList embedded defaultStatus="Cancelled" />
}
