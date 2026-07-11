import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const COMPANY_KEY = 'tms-company-id'
const DEMO_COMPANY_ID = '00000000-0000-4000-8000-000000000001'

const CompanyContext = createContext(null)

export function getStoredCompanyId() {
  return localStorage.getItem(COMPANY_KEY)
}

export function CompanyProvider({ children }) {
  const { user } = useAuth()
  const [selectedCompanyId, setSelectedCompanyIdState] = useState(() => getStoredCompanyId())

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(COMPANY_KEY)
      setSelectedCompanyIdState(null)
      return
    }
    if (user.isPlatformAdmin) {
      const stored = getStoredCompanyId() || DEMO_COMPANY_ID
      localStorage.setItem(COMPANY_KEY, stored)
      setSelectedCompanyIdState(stored)
      return
    }
    const id = user.companyId ?? null
    setSelectedCompanyIdState(id)
    if (id) localStorage.setItem(COMPANY_KEY, id)
    else localStorage.removeItem(COMPANY_KEY)
  }, [user?.companyId, user?.isPlatformAdmin, user])

  const effectiveCompanyId = user?.isPlatformAdmin
    ? selectedCompanyId
    : (user?.companyId ?? null)

  const needsCompanySelection = Boolean(user?.isPlatformAdmin && !effectiveCompanyId)

  const setSelectedCompanyId = (id) => {
    if (id) localStorage.setItem(COMPANY_KEY, id)
    else localStorage.removeItem(COMPANY_KEY)
    setSelectedCompanyIdState(id || null)
    localStorage.removeItem('tms-branch-id')
    window.dispatchEvent(new CustomEvent('tms-company-changed', { detail: id }))
  }

  const value = useMemo(() => ({
    effectiveCompanyId,
    selectedCompanyId: effectiveCompanyId,
    needsCompanySelection,
    setSelectedCompanyId,
    companyName: user?.isPlatformAdmin ? null : user?.companyName,
  }), [effectiveCompanyId, needsCompanySelection, user?.companyName, user?.isPlatformAdmin])

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
