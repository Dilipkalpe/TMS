import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import { bookingStatuses, paymentStatuses } from '../../data/bookings'
import { vehicles, drivers } from '../../data/lr'
import { Save, ArrowLeft } from 'lucide-react'

export default function NewBooking() {
  const navigate = useNavigate()

  return (
    <ERPContentPage module="Booking" title="Add New Record">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Booking Date" type="date" defaultValue="2026-06-18" />
          <Input label="Customer" placeholder="Select customer" />
          <Input label="Consignor" placeholder="Consignor name" />
          <Input label="Consignee" placeholder="Consignee name" />
          <Input label="From" placeholder="Origin city" />
          <Input label="To" placeholder="Destination city" />
          <Input label="Material" placeholder="Material type" />
          <Input label="Quantity" placeholder="e.g. 12 MT" />
          <Select label="Vehicle" options={['Select Vehicle', ...vehicles]} />
          <Select label="Driver" options={['Select Driver', ...drivers]} />
          <Input label="Freight (₹)" type="number" placeholder="0" />
          <Input label="Advance (₹)" type="number" placeholder="0" />
          <Select label="Booking Status" options={bookingStatuses} />
          <Select label="Payment Status" options={paymentStatuses} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea label="Remarks" placeholder="Additional notes..." />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={Save}>Save Booking</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/bookings')}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
