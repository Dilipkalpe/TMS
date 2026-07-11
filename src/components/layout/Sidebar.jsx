import * as Icons from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { navigation, platformNavigation } from '../../config/navigation'
import { useSidebar } from '../../context/SidebarContext'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useSubscription } from '../../context/SubscriptionContext'
import { ChevronDown, ChevronLeft, Truck, X } from 'lucide-react'

function NavIcon({ name }) {
  const Icon = Icons[name] || Icons.Circle
  return <Icon className="h-5 w-5 shrink-0" />
}

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation()
  const hasChildren = item.children?.length > 0
  const isChildActive = hasChildren && item.children.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'))
  const [open, setOpen] = useState(isChildActive)

  if (!hasChildren) {
    return (
      <NavLink
        to={item.path}
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            isActive
              ? 'bg-primary text-white shadow-sm shadow-primary/25 ring-1 ring-accent/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`
        }
      >
        <NavIcon name={item.icon} />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isChildActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <NavIcon name={item.icon} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      {!collapsed && open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition-all ${
                  isActive ? 'bg-primary/20 text-primary font-medium' : 'text-slate-400 hover:text-white'
                }`
              }
            >
              {child.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar()
  const { user } = useAuth()
  const { needsCompanySelection } = useCompany()
  const { hasFeature } = useSubscription()

  const items = needsCompanySelection
    ? []
    : navigation.filter((item) => !item.feature || hasFeature(item.feature))
  const platformItems = user?.isPlatformAdmin ? platformNavigation : []

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-secondary transition-all duration-300 lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700/50 px-3 sm:h-14 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark ring-2 ring-accent/40">
              <Truck className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-bold text-white">TMS Pro</p>
                <p className="text-[10px] font-medium tracking-wide text-accent">Transport · Freight · Fleet</p>
              </div>
            )}
          </div>
          <button onClick={closeMobile} className="text-slate-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {platformItems.map((item) => (
            <NavItem key={item.title} item={item} collapsed={collapsed} onNavigate={closeMobile} />
          ))}
          {platformItems.length > 0 && <div className="my-2 border-t border-slate-700/50" />}
          {items.map((item) => (
            <NavItem key={item.title} item={item} collapsed={collapsed} onNavigate={closeMobile} />
          ))}
        </nav>

        <div className="hidden border-t border-slate-700/50 p-3 lg:block">
          <button
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
