import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Package,
  Route,
  Truck,
  User,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import LoginBackground from '../../components/auth/LoginBackground'
import Button from '../../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const result = login(username, password)
      setLoading(false)
      if (result.ok) navigate(from, { replace: true })
      else setError(result.error)
    }, 500)
  }

  return (
    <div className="login-page relative flex min-h-screen flex-col overflow-auto">
      <LoginBackground />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">TMS Pro</p>
            <p className="text-xs font-medium text-primary">Transport & Logistics ERP</p>
          </div>
        </div>
        <div className="hidden items-center gap-6 text-sm text-slate-600 dark:text-slate-400 md:flex">
          <span className="flex items-center gap-1.5">
            <Route className="h-4 w-4 text-primary" />
            1,200+ Trips
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            150+ Clients
          </span>
        </div>
      </header>

      {/* Center card */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90">
            {/* Card accent strip */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-blue-400 to-cyan-400" />

            <div className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Sign in to TMS</h1>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Fleet, freight & accounting in one place
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-11 pr-11 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Remember me
                  </label>
                  <button type="button" className="font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="group w-full py-3 text-base"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : (
                    <>
                      Sign In to Dashboard
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                Demo login — <strong className="text-slate-700 dark:text-slate-200">admin</strong> /{' '}
                <strong className="text-slate-700 dark:text-slate-200">admin123</strong>
              </div>
            </div>
          </div>

          {/* Feature chips */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[
              { icon: Truck, label: 'Fleet Mgmt' },
              { icon: Package, label: 'LR & Freight' },
              { icon: Route, label: 'Trip Tracking' },
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

      <footer className="relative z-10 px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
        © 2026 TMS Pro · Enterprise Transport Management · India
      </footer>
    </div>
  )
}
