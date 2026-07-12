import { Link, Outlet, useNavigate } from 'react-router-dom'
import { FileText, LogOut, Package, Truck } from 'lucide-react'
import { usePortalAuth } from '../../context/PortalAuthContext'
import AppFooter from '../../components/layout/AppFooter'

export default function PortalLayout() {
  const { profile, logout } = usePortalAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/portal/login')
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Truck className="h-5 w-5" />
            </div>
            TMS Customer Portal
          </div>
          <nav className="flex gap-1 text-sm">
            <Link to="/portal" className="rounded-lg px-3 py-1.5 font-medium hover:bg-primary/5 hover:text-primary">Shipments</Link>
            {profile?.scope !== 'booking' && (
              <Link to="/portal/invoices" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium hover:bg-primary/5 hover:text-primary">
                <FileText className="h-3.5 w-3.5" /> Invoices
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden max-w-[160px] truncate text-slate-600 dark:text-slate-300 sm:inline">{profile?.name}</span>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="app-scroll mobile-scroll-y mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto overflow-x-hidden px-4 py-6">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}

export function PortalEmptyState({ icon: Icon = Package, title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Icon className="mx-auto mb-3 h-10 w-10 text-slate-400" />
      <p className="font-medium">{title}</p>
      {children}
    </div>
  )
}
