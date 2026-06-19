import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = () => setCollapsed((c) => !c)
  const toggleMobile = () => setMobileOpen((o) => !o)
  const closeMobile = () => setMobileOpen(false)

  return (
    <SidebarContext.Provider
      value={{ collapsed, mobileOpen, toggleCollapsed, toggleMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
