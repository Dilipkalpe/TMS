import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { buildErpBreadcrumb } from '../utils/erpBreadcrumb'

const defaultTitle = {
  module: 'Dashboard',
  title: 'Overview',
  breadcrumb: buildErpBreadcrumb('Dashboard', 'Overview'),
  shortcuts: null,
  headerStyle: 'erp',
  toolbar: null,
}

const PageTitleContext = createContext(null)

export function PageTitleProvider({ children }) {
  const [pageTitle, setPageTitleState] = useState(defaultTitle)
  const [headerActions, setHeaderActions] = useState({})

  const setPageTitle = useCallback((module, title, options = {}) => {
    const resolvedTitle = title || module || 'Overview'
    const resolvedModule = module || 'Dashboard'
    setPageTitleState({
      module: resolvedModule,
      title: resolvedTitle,
      breadcrumb: options.breadcrumb ?? buildErpBreadcrumb(resolvedModule, resolvedTitle),
      shortcuts: options.shortcuts ?? null,
      headerStyle: options.headerStyle ?? 'erp',
      toolbar: options.toolbar ?? null,
    })
  }, [])

  const registerHeaderActions = useCallback((actions) => {
    setHeaderActions(actions ?? {})
    return () => setHeaderActions({})
  }, [])

  const resetPageTitle = useCallback(() => {
    setPageTitleState(defaultTitle)
    setHeaderActions({})
  }, [])

  const value = useMemo(
    () => ({
      ...pageTitle,
      headerActions,
      setPageTitle,
      registerHeaderActions,
      resetPageTitle,
    }),
    [pageTitle, headerActions, setPageTitle, registerHeaderActions, resetPageTitle],
  )

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}

export function usePageTitle() {
  const ctx = useContext(PageTitleContext)
  if (!ctx) {
    return {
      ...defaultTitle,
      headerActions: {},
      setPageTitle: () => {},
      registerHeaderActions: () => () => {},
      resetPageTitle: () => {},
    }
  }
  return ctx
}

/** Default ERP list page shortcut pills (mockup). */
export const ERP_LIST_SHORTCUTS = [
  { id: 'new', label: 'New LR', keys: 'F2' },
  { id: 'search', label: 'Search', keys: 'F3' },
  { id: 'save', label: 'Save', keys: 'Ctrl + S' },
  { id: 'refresh', label: 'Refresh', keys: 'F8' },
]
