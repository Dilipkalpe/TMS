import { createContext, useContext, useEffect, useState } from 'react'
import { branchesApi, getToken, unwrapList } from '../services/api'
import { useAuth } from './AuthContext'
import { getStoredCompanyId } from './CompanyContext'

const BRANCH_KEY = 'tms-branch-id'

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { isAuthenticated, booting } = useAuth()
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchIdState] = useState(() => localStorage.getItem(BRANCH_KEY) || 'all')
  const [loading, setLoading] = useState(true)
  const companyId = getStoredCompanyId()

  const setSelectedBranchId = (id) => {
    const value = id || 'all'
    setSelectedBranchIdState(value)
    if (value === 'all') localStorage.removeItem(BRANCH_KEY)
    else localStorage.setItem(BRANCH_KEY, value)
    window.dispatchEvent(new CustomEvent('tms-branch-changed', { detail: value }))
  }

  const loadBranches = async () => {
    try {
      const list = unwrapList(await branchesApi.list(true))
      setBranches(Array.isArray(list) ? list : [])
    } catch {
      setBranches([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (booting) return
    if (!isAuthenticated || !getToken()) {
      setBranches([])
      setLoading(false)
      return
    }
    setLoading(true)
    loadBranches()
  }, [booting, isAuthenticated, companyId])

  useEffect(() => {
    if (!selectedBranchId || selectedBranchId === 'all') return
    if (branches.length && !branches.some((b) => String(b.id) === String(selectedBranchId))) {
      setSelectedBranchId('all')
    }
  }, [branches, selectedBranchId])

  const selectedBranch = branches.find((b) => String(b.id) === String(selectedBranchId)) ?? null

  return (
    <BranchContext.Provider value={{
      branches,
      loading,
      selectedBranchId,
      selectedBranch,
      setSelectedBranchId,
      reloadBranches: loadBranches,
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used within BranchProvider')
  return ctx
}

export function getStoredBranchId() {
  return localStorage.getItem(BRANCH_KEY)
}
