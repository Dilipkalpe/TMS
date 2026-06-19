import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const PageTitleContext = createContext(null)

export function PageTitleProvider({ children }) {
  const [pageTitle, setPageTitleState] = useState({ module: 'Dashboard', title: 'Overview' })

  const setPageTitle = useCallback((module, title) => {
    setPageTitleState({ module, title })
  }, [])

  const value = useMemo(() => ({ ...pageTitle, setPageTitle }), [pageTitle, setPageTitle])

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}

export function usePageTitle() {
  const ctx = useContext(PageTitleContext)
  if (!ctx) {
    return { module: 'TMS Pro', title: '', setPageTitle: () => {} }
  }
  return ctx
}
