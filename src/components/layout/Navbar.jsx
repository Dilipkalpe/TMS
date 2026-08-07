import { LogOut, Menu, Moon, Sun, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useSidebar } from '../../context/SidebarContext'
import { useAuth } from '../../context/AuthContext'
import NotificationPanel from './NotificationPanel'
import BranchSelector from './BranchSelector'
import CompanySelector from './CompanySelector'
import GlobalSearch from './GlobalSearch'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { toggleMobile } = useSidebar()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header z-30 shrink-0 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-6">
        <button
          onClick={toggleMobile}
          className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-0 shrink-0 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TMS Pro</p>
        </div>

        <div className="hidden flex-1 justify-center px-4 md:flex">
          <GlobalSearch className="w-full max-w-xl" />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 md:flex-none">
          {user?.isPlatformAdmin ? <CompanySelector /> : null}
          <BranchSelector />
          <button
            onClick={toggleTheme}
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:inline-flex dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <NotificationPanel />
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name ?? 'User'}</p>
              <p className="text-[10px] text-slate-500">{user?.role ?? 'Operator'}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
              <User className="h-4 w-4" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 pb-2 md:hidden dark:border-slate-800">
        <GlobalSearch className="w-full" />
      </div>
    </header>
  )
}
