import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Phone, Truck } from 'lucide-react'
import Button from '../../components/ui/Button'
import { useDriverAuth } from '../../context/DriverAuthContext'

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
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading…
      </div>
    )
  }
  if (isAuthenticated) return <Navigate to="/driver" replace />

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Portal</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in to view your trip and share live location</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white/10 p-6 backdrop-blur">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm text-slate-200">
              <Phone className="h-4 w-4" /> Mobile number
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
              className="w-full rounded-xl border-0 bg-white px-4 py-3.5 text-base text-slate-900 outline-none ring-2 ring-transparent focus:ring-emerald-400"
              placeholder="10-digit mobile"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm text-slate-200">
              <Lock className="h-4 w-4" /> Access PIN
            </span>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full rounded-xl border-0 bg-white px-4 py-3.5 pr-12 text-base text-slate-900 outline-none ring-2 ring-transparent focus:ring-emerald-400"
                placeholder="Driver App Access PIN"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          {error && (
            <p className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Location is used only after you start a trip. HTTPS required for GPS.
        </p>
      </div>
    </div>
  )
}
