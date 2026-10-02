import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, MapPin, Phone, Truck } from 'lucide-react'
import LoginBackground from '../../components/auth/LoginBackground'
import BrandLogo from '../../components/brand/BrandLogo'
import Button from '../../components/ui/Button'
import { useDriverAuth } from '../../context/DriverAuthContext'
import { BRAND, brandCopyright } from '../../config/brand'

export default function DriverLogin() {
  const navigate = useNavigate()
  const { login, isAuthenticated, booting } = useDriverAuth()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone, pin)
      navigate('/driver')
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
  if (isAuthenticated) return <Navigate to="/driver" replace />

  return (
    <div className="login-page relative flex min-h-screen flex-col overflow-auto">
      <LoginBackground />

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo variant="theme" imgClassName="h-9 w-auto max-h-10 sm:h-10" />
          <p className="truncate text-sm font-semibold text-primary">Driver Portal</p>
        </div>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Staff login
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90">
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="p-6 sm:p-8">
              <div className="mb-6 flex flex-col items-center">
                <h1 className="sr-only">Driver Portal — {BRAND.productName}</h1>
                <BrandLogo
                  variant="hero"
                  imgClassName="h-12 w-auto max-w-[260px] sm:h-14 sm:max-w-[300px]"
                />
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Sign in to view your trip and share live location
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mobile number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Access PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="current-password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="Driver App Access PIN"
                      className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-11 pr-11 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="group w-full py-3 text-base" disabled={loading}>
                  {loading ? (
                    'Signing in...'
                  ) : (
                    <>
                      Sign In to Driver Portal
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                Location is used only after you start a trip. HTTPS required for GPS.
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[
              { icon: Truck, label: 'My Trips' },
              { icon: MapPin, label: 'Live Location' },
              { icon: Phone, label: 'Mobile First' },
            ].map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
              >
                <chip.icon className="h-3.5 w-3.5 text-primary" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 space-y-1 px-4 py-4 text-center text-xs text-slate-500">
        <p>
          Powered by {BRAND.companyName}
          {' · '}
          <a href={BRAND.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {BRAND.website}
          </a>
        </p>
        <p className="text-[10px] text-slate-400">
          {brandCopyright()}
          {' · '}
          <Link to="/portal/login" className="text-primary hover:underline">
            Customer portal
          </Link>
        </p>
      </footer>
    </div>
  )
}
