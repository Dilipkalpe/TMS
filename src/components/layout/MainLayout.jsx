import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import AppFooter from './AppFooter'
import { PageTitleProvider } from '../../context/PageTitleContext'
import { useKeyboardShortcutsOptional } from '../../context/KeyboardShortcutContext'
import { useEffect } from 'react'
import { focusFirstEditable } from '../../keyboard/keyUtils'

function RouteAutoFocus() {
  const location = useLocation()
  const kbd = useKeyboardShortcutsOptional()

  useEffect(() => {
    if (!kbd?.tallyMode) return
    const t = setTimeout(() => {
      const root = document.querySelector('[data-kbd-form-root]') ?? document.querySelector('main')
      focusFirstEditable(root ?? document)
    }, 120)
    return () => clearTimeout(t)
  }, [location.pathname, kbd?.tallyMode])

  return null
}

export default function MainLayout() {
  return (
    <PageTitleProvider>
      <RouteAutoFocus />
      <div className="flex h-dvh w-full min-w-0 overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="app-shell-bg app-scroll mobile-scroll-y flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-2 sm:p-3 lg:p-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          </main>
          <AppFooter />
        </div>
      </div>
    </PageTitleProvider>
  )
}
