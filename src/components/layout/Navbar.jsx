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
    <header className="app-header z-30 shrink-0 overflow-hidden border-b border-primary/20 bg-gradient-to-r from-primary/12 via-white to-accent/5 shadow-sm dark:border-primary/25 dark:from-primary/20 dark:via-slate-900 dark:to-slate-900">
      <div className="flex h-11 items-center gap-1 px-2 sm:h-12 sm:gap-2 sm:px-3 lg:h-14 lg:px-6">
        <button
          onClick={toggleMobile}
          className="shrink-0 rounded-lg p-1.5 text-primary hover:bg-primary/10 lg:hidden dark:text-blue-200 dark:hover:bg-primary/20"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xs font-semibold leading-tight sm:text-sm lg:text-base">
            <span className="text-primary dark:text-blue-300">{module}</span>
            {title && (
              <>
                <span className="mx-1 font-normal text-primary/50 dark:text-slate-500">/</span>
                <span className="text-slate-800 dark:text-slate-100">{title}</span>
              </>
            )}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {user?.isPlatformAdmin ? <CompanySelector /> : user?.companyName ? (
            <span className="hidden max-w-[160px] truncate text-xs font-medium text-slate-600 dark:text-slate-300 xl:inline" title={user.companyName}>
              {user.companyName}
            </span>
          ) : null}
          <BranchSelector />
          <button
            onClick={toggleTheme}
            className="hidden rounded-lg p-2 text-primary transition-all hover:bg-primary/10 sm:inline-flex dark:text-blue-200 dark:hover:bg-primary/20"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          <NotificationPanel />
          <div className="flex items-center gap-0.5 rounded-lg sm:gap-1.5 sm:rounded-xl sm:border sm:border-primary/20 sm:bg-white/90 sm:px-2 sm:py-1.5 sm:shadow-sm dark:sm:border-primary/30 dark:sm:bg-slate-800/90">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-500">{user?.role ?? 'Operator'}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm sm:h-9 sm:w-9">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 sm:p-2 dark:hover:bg-red-950/50"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
