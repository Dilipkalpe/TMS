import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
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
import ApiStatusIndicator from '../../components/auth/ApiStatusIndicator'
import BrandLogo from '../../components/brand/BrandLogo'
import Button from '../../components/ui/Button'
import { BRAND, brandCopyright } from '../../config/brand'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState(import.meta.env.PROD ? '' : 'admin')
  const [password, setPassword] = useState(import.meta.env.PROD ? '' : 'admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (result.ok) navigate(from, { replace: true })
    else setError(result.error)
  }

  return (
    <div className="login-page relative flex min-h-screen flex-col overflow-auto">
      <LoginBackground />

      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <BrandLogo variant="theme" imgClassName="h-9 w-auto max-h-10 sm:h-10" />
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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90">
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="p-6 sm:p-8">
              <div className="mb-6 flex justify-center">
                <h1 className="sr-only">{BRAND.productName}</h1>
                <BrandLogo
                  variant="hero"
                  imgClassName="h-12 w-auto max-w-[260px] sm:h-14 sm:max-w-[300px]"
                />
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

              <div className="mt-4">
                <ApiStatusIndicator />
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                Demo login — <strong className="text-slate-700 dark:text-slate-200">admin</strong> /{' '}
                <strong className="text-slate-700 dark:text-slate-200">admin123</strong>
              </div>
            </div>
          </div>

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

      <footer className="relative z-10 space-y-1 px-4 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
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
          <Link to="/portal/login" className="text-primary hover:underline">Customer portal</Link>
        </p>
      </footer>
    </div>
  )
}
