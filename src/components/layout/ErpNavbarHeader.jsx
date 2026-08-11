import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSidebar } from '../../context/SidebarContext'
import { useAuth } from '../../context/AuthContext'
import { usePageTitle } from '../../context/PageTitleContext'
import { buildErpBreadcrumb } from '../../utils/erpBreadcrumb'
import BranchSelector from './BranchSelector'

function BreadcrumbTrail({ items }) {
  if (!items?.length) return null
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-primary" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-primary/50">/</span>}
          {item.path ? (
            <Link to={item.path} className="hover:underline">{item.label}</Link>
          ) : (
            <span className="font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function ShortcutPills({ shortcuts, actions }) {
  return (
    <div className="hidden flex-wrap items-center justify-center gap-2 lg:flex">
      {shortcuts.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => actions?.[s.id]?.()}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 dark:border-primary/30 dark:bg-slate-800 dark:text-slate-200"
        >
          <span className="rounded border border-primary/20 bg-primary/5 px-1 py-0.5 text-[10px] font-bold text-primary">{s.keys}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </span>
        <span className="hidden max-w-[8rem] truncate md:inline">{user?.name ?? 'User'}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default function ErpNavbarHeader() {
  const { module, title, breadcrumb, shortcuts, headerActions, toolbar } = usePageTitle()
  const { toggleMenu } = useSidebar()

  const shortcutList = shortcuts?.length ? shortcuts : null
  const crumbs = breadcrumb ?? buildErpBreadcrumb(module, title)

  return (
    <header className="app-header z-30 shrink-0 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-5">
        <button
          type="button"
          onClick={toggleMenu}
          className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 shrink-0 lg:min-w-[12rem]">
          <h1 className={`truncate font-bold leading-tight text-primary ${toolbar ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
            {title}
          </h1>
          {!toolbar ? <BreadcrumbTrail items={crumbs} /> : null}
        </div>

        {toolbar ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 md:flex">
            {toolbar}
          </div>
        ) : (
          <div className="hidden min-w-0 flex-1 justify-center px-2 xl:flex">
            {shortcutList?.length ? (
              <ShortcutPills shortcuts={shortcutList} actions={headerActions} />
            ) : null}
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <BranchSelector variant="erp" />
          <UserMenu />
        </div>
      </div>

      {shortcutList?.length ? (
        <div className="flex justify-center border-t border-slate-100 px-3 py-2 xl:hidden dark:border-slate-800">
          <ShortcutPills shortcuts={shortcutList} actions={headerActions} />
        </div>
      ) : toolbar ? (
        <div className="flex flex-wrap justify-end gap-1.5 border-t border-slate-100 px-3 py-2 md:hidden dark:border-slate-800">
          {toolbar}
        </div>
      ) : null}
    </header>
  )
}
