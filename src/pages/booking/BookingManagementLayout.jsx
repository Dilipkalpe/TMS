import { NavLink, Outlet, useLocation } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Button from '../../components/ui/Button'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

const BOOKING_TABS = [
  { id: 'quotations', label: 'Quotations', path: '/bookings/quotations' },
  { id: 'pending', label: 'Pending Booking', path: '/bookings/pending' },
  { id: 'confirmed', label: 'Confirmed Booking', path: '/bookings/confirmed' },
  { id: 'cancelled', label: 'Cancelled Booking', path: '/bookings/cancelled' },
]

export default function BookingManagementLayout() {
  const { pathname } = useLocation()

  return (
    <ERPContentPage
      module="Booking Management"
      title="Booking Management"
      toolbar={(
        <div className="flex gap-2">
          <Link to="/quotations/new">
            <Button variant="outline" icon={Plus}>New Quotation</Button>
          </Link>
          <Link to="/bookings/new">
            <Button icon={Plus}>New Booking</Button>
          </Link>
        </div>
      )}
    >
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {BOOKING_TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium sm:text-sm ${
                isActive || pathname === tab.path
                  ? 'bg-white text-primary shadow-sm dark:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </ERPContentPage>
  )
}
