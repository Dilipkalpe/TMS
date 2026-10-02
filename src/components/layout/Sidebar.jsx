import * as Icons from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { navigation, platformNavigation } from '../../config/navigation'
import { useSidebar } from '../../context/SidebarContext'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useSubscription } from '../../context/SubscriptionContext'
import { usePrint } from '../../context/PrintContext'
import CompanyBrandLogo from '../brand/CompanyBrandLogo'
import { X } from 'lucide-react'
import { BRAND } from '../../config/brand'

function NavIcon({ name }) {
  const Icon = Icons[name] || Icons.Circle
  return <Icon className="h-5 w-5 shrink-0" />
}

function prefixActive(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isExcluded(pathname, item) {
  const excludes = [
    ...(item.excludePrefix ? [item.excludePrefix] : []),
    ...(item.excludePrefixes || []),
  ]
  return excludes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function navIsActive(pathname, item) {
  const p = pathname
  if (isExcluded(p, item)) return false
  if (item.exact) return p === item.path
  const prefixes = item.matchPrefixes?.length
    ? item.matchPrefixes
    : (item.matchPrefix ? [item.matchPrefix] : null)
  if (prefixes) {
    return p === item.path || prefixes.some((prefix) => prefixActive(p, prefix))
  }
  if (item.path === '/') return p === '/'
  return p === item.path || p.startsWith(`${item.path}/`)
}

function NavItem({ item, mode, onNavigate }) {
  const location = useLocation()
  const iconOnly = mode === 'icon'
  const active = navIsActive(location.pathname, item)

  return (
    <NavLink
      to={item.path}
      end={item.path === '/' || Boolean(item.exact)}
      onClick={onNavigate}
      title={iconOnly ? item.title : undefined}
      className={() =>
        `flex items-center rounded-xl py-2.5 text-sm font-medium transition-all ${
          iconOnly ? 'justify-center px-2' : 'gap-3 px-3'
        } ${
          active
            ? 'bg-primary text-white shadow-sm shadow-primary/25 ring-1 ring-accent/30'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <NavIcon name={item.icon} />
      {!iconOnly && <span>{item.title}</span>}
    </NavLink>
  )
}

function NavList({ items, platformItems, mode, onNavigate }) {
  return (
    <>
      {platformItems.map((item) => (
        <NavItem key={item.title} item={item} mode={mode} onNavigate={onNavigate} />
      ))}
      {platformItems.length > 0 && <div className="my-2 border-t border-slate-700/50" />}
      {items.map((item) => (
        <NavItem key={item.title} item={item} mode={mode} onNavigate={onNavigate} />
      ))}
    </>
  )
}

export default function Sidebar() {
  const { menuExpanded, collapseMenu } = useSidebar()
  const { user } = useAuth()
  const { needsCompanySelection } = useCompany()
  const { hasFeature, canAccessPath } = useSubscription()
  const { company } = usePrint()

  const items = needsCompanySelection
    ? []
    : navigation.filter((item) => {
      if (item.feature && !hasFeature(item.feature)) return false
      // Role menu visibility (menuKeys); canAccessPath also layers subscription rules
      return canAccessPath(item.path)
    })
  const platformItems = user?.isPlatformAdmin ? platformNavigation : []
  const clientName = company?.companyName || user?.companyName || ''

  const closePopup = () => collapseMenu()

  return (
    <>
      <aside className="hidden h-screen w-[4.5rem] shrink-0 flex-col border-r border-slate-700/40 bg-secondary lg:flex">
        <div
          className="app-sidebar-brand app-sidebar-brand--collapsed flex h-14 shrink-0 items-stretch border-b border-slate-700/50"
          title={clientName || BRAND.productName}
        >
          <CompanyBrandLogo />
        </div>
        <nav className="app-scroll flex-1 space-y-1 overflow-y-auto p-2">
          <NavList items={items} platformItems={platformItems} mode="icon" onNavigate={() => {}} />
        </nav>
      </aside>

      {menuExpanded && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px]"
            onClick={closePopup}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-[70] flex h-screen w-72 max-w-[85vw] flex-col bg-secondary shadow-2xl ring-1 ring-white/10 transition-transform duration-300 ease-out"
          >
            <div className="app-sidebar-brand app-sidebar-brand--expanded flex h-14 shrink-0 items-stretch gap-2 border-b border-slate-700/50 px-2 sm:px-3">
              <div className="app-sidebar-brand__logo-slot min-h-0 min-w-0 flex-1">
                <CompanyBrandLogo />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="truncate text-sm font-bold text-white">
                  {clientName || BRAND.productName}
                </p>
                <p className="truncate text-[10px] font-medium tracking-wide text-slate-400">
                  {BRAND.productName}
                </p>
              </div>
              <button
                type="button"
                onClick={closePopup}
                className="shrink-0 self-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="app-scroll mobile-scroll-y flex-1 space-y-1 overflow-y-auto p-3">
              <NavList items={items} platformItems={platformItems} mode="full" onNavigate={closePopup} />
            </nav>
          </aside>
        </>
      )}
    </>
  )
}
