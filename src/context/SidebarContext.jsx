import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  /** false = icon-only rail; true = full menu with labels */
  const [menuExpanded, setMenuExpanded] = useState(false)

  const toggleMenu = () => setMenuExpanded((o) => !o)
  const collapseMenu = () => setMenuExpanded(false)

  return (
    <SidebarContext.Provider value={{ menuExpanded, toggleMenu, collapseMenu }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
