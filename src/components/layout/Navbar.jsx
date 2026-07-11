import { LogOut, Menu, Moon, Sun, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useSidebar } from '../../context/SidebarContext'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/PageTitleContext'
import NotificationPanel from './NotificationPanel'
import BranchSelector from './BranchSelector'
import CompanySelector from './CompanySelector'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { toggleMobile } = useSidebar()
  const { user, logout } = useAuth()
  const { module, title } = usePageTitle()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header z-30 shrink-0 border-b border-primary/20 bg-gradient-to-r from-primary/12 via-white to-accent/5 shadow-sm dark:border-primary/25 dark:from-primary/20 dark:via-slate-900 dark:to-slate-900">
      <div className="flex h-12 items-center justify-between px-3 sm:h-14 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
          <button
            onClick={toggleMobile}
            className="shrink-0 rounded-lg p-2 text-primary hover:bg-primary/10 lg:hidden dark:text-blue-200 dark:hover:bg-primary/20"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 shrink-0">
            <h1 className="truncate text-sm font-semibold sm:text-base">
              <span className="text-primary dark:text-blue-300">{module}</span>
              {title && (
                <>
                  <span className="mx-1.5 font-normal text-primary/50 sm:mx-2 dark:text-slate-500">/</span>
                  <span className="text-slate-800 dark:text-slate-100">{title}</span>
                </>
              )}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center space-x-1 sm:space-x-2">
          {user?.isPlatformAdmin ? <CompanySelector /> : user?.companyName ? (
            <span className="hidden max-w-[160px] truncate text-xs font-medium text-slate-600 dark:text-slate-300 lg:inline" title={user.companyName}>
              {user.companyName}
            </span>
          ) : null}
          <BranchSelector />
          <button
            onClick={toggleTheme}
            className="rounded-xl p-2.5 text-primary transition-all hover:bg-primary/10 dark:text-blue-200 dark:hover:bg-primary/20"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <NotificationPanel />
          <div className="ml-0.5 flex items-center space-x-2 rounded-xl border border-primary/20 bg-white/90 px-2 py-1.5 shadow-sm sm:ml-1 sm:space-x-3 sm:px-3 dark:border-primary/30 dark:bg-slate-800/90">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-500">{user?.role ?? 'Operator'}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <User className="h-4 w-4" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
