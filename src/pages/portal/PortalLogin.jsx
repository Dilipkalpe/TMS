import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  MapPin,
  Package,
  Phone,
  Truck,
  User,
} from 'lucide-react'
import LoginBackground from '../../components/auth/LoginBackground'
import Button from '../../components/ui/Button'
import { portalApi } from '../../services/api'
import { usePortalAuth } from '../../context/PortalAuthContext'

const FALLBACK_DEMOS = [
  { branchCode: 'HO-MUM', branchName: 'Head Office — Mumbai', customerName: 'Reliance Logistics', phone: '9820012345', pin: '123456', sampleBooking: 'BK-1042' },
  { branchCode: 'PUN', branchName: 'Pune Branch', customerName: 'Mahindra & Mahindra', phone: '9820045678', pin: '234567', sampleBooking: 'BK-1039' },
  { branchCode: 'DEL', branchName: 'Delhi Branch', customerName: 'Tata Steel Ltd', phone: '9820023456', pin: '345678', sampleBooking: 'BK-1041' },
]

export default function PortalLogin() {
  const navigate = useNavigate()
  const { login, trackLogin, isAuthenticated, booting } = usePortalAuth()
  const [mode, setMode] = useState('customer')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demos, setDemos] = useState(FALLBACK_DEMOS)

  useEffect(() => {
    portalApi.demoLogins()
      .then((rows) => { if (rows?.length) setDemos(rows) })
      .catch(() => setDemos(FALLBACK_DEMOS))
  }, [])

  const fillDemo = (d) => {
    setMode('customer')
    setPhone(d.phone?.replace(/\D/g, '').slice(-10) ?? '')
    setPin(d.pin ?? '')
    setError('')
  }

  const fillQuickTrack = (d) => {
    setMode('track')
    setBookingId(d.sampleBooking ?? '')
    setPhone(d.phone?.replace(/\D/g, '').slice(-10) ?? '')
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'customer') {
        await login(phone, pin)
        navigate('/portal')
      } else {
        await trackLogin(bookingId, phone)
        navigate(`/portal/track/${bookingId.trim()}`)
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">
        Loading…
      </div>
    )
  }
  if (isAuthenticated) return <Navigate to="/portal" replace />

  return (
    <div className="login-page relative flex min-h-screen flex-col overflow-auto">
      <LoginBackground />

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg ring-2 ring-accent/30">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">TMS Pro</p>
            <p className="text-xs font-medium text-primary">Customer Tracking Portal</p>
          </div>
        </div>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">Staff login</Link>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-4 lg:grid-cols-5 lg:px-6 lg:py-8">
        {/* Demo credentials by branch */}
        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Building2 className="h-4 w-4 text-primary" />
              Demo logins by branch
            </h2>
            <p className="mb-4 text-xs text-slate-500">Temporary demo accounts — click to fill the form</p>
            <div className="space-y-3">
              {demos.map((d) => (
                <div
                  key={`${d.branchCode}-${d.customerId ?? d.customerName}`}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        {d.branchCode}
                      </span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{d.branchName}</p>
                      <p className="text-xs text-slate-500">{d.customerName}</p>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Phone: <strong className="text-slate-800 dark:text-slate-200">{d.phone}</strong></span>
                    <span>PIN: <strong className="text-slate-800 dark:text-slate-200">{d.pin}</strong></span>
                    {d.sampleBooking && (
                      <span className="col-span-2">Sample booking: <strong>{d.sampleBooking}</strong></span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemo(d)}
                      className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark"
                    >
                      Use login
                    </button>
                    {d.sampleBooking && (
                      <button
                        type="button"
                        onClick={() => fillQuickTrack(d)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-white dark:border-slate-600 dark:hover:bg-slate-800"
                      >
                        Quick track
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-600 dark:text-slate-400">
            {[
              { icon: Package, label: 'Shipments' },
              { icon: MapPin, label: 'Live GPS' },
              { icon: FileText, label: 'Invoices' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-white/50 bg-white/60 p-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60">
                <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </aside>

        {/* Login form */}
        <div className="flex items-center lg:col-span-3">
          <div className="w-full max-w-md animate-fade-in lg:mx-auto">
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90">
              <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
              <div className="p-6 sm:p-8">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Track your freight</h1>
                  <p className="mt-1.5 text-sm text-slate-500">Live map · ETA · POD · Invoices</p>
                </div>

                <div className="mb-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setMode('customer')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === 'customer' ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'}`}
                  >
                    Customer login
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('track')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === 'track' ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'}`}
                  >
                    Quick track
                  </button>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40">
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  {mode === 'track' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Booking ID</label>
                      <input
                        value={bookingId}
                        onChange={(e) => setBookingId(e.target.value)}
                        placeholder="e.g. BK-1042"
                        className="w-full rounded-xl border border-slate-200/80 bg-white py-3 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9820012345"
                        className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  {mode === 'customer' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Portal PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          placeholder="6-digit PIN"
                          className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-11 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          required
                        />
                        <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <Button type="submit" disabled={loading} className="group w-full py-3">
                    {loading ? 'Please wait…' : (
                      <>
                        {mode === 'customer' ? 'Sign in to portal' : 'Track shipment'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-4 py-4 text-center text-xs text-slate-500">
        © 2026 TMS Pro · Secure customer portal · Powered by GPS & notifications
      </footer>
    </div>
  )
}
