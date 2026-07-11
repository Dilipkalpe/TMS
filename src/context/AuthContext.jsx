import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, setToken, getToken } from '../services/api'
import { APP_BASE_PATH } from '../config/api'

const AUTH_KEY = 'tms-auth'
const BRANCH_KEY = 'tms-branch-id'
const DEMO_COMPANY_ID = '00000000-0000-4000-8000-000000000001'

const AuthContext = createContext(null)

function mapProfile(res) {
  return {
    name: res.name,
    role: res.role,
    username: res.username,
    companyId: res.companyId,
    companyName: res.companyName,
    branchId: res.branchId,
    branchName: res.branchName,
    canAccessAllBranches: res.canAccessAllBranches,
    isPlatformAdmin: res.isPlatformAdmin,
    planCode: res.planCode,
    features: res.features ?? [],
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [booting, setBooting] = useState(!!getToken())

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_KEY)
  }, [user])

  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null)
      setUser(null)
      localStorage.removeItem(BRANCH_KEY)
      const path = window.location.pathname
      if (path.includes('/portal')) return
      const loginPath = `${APP_BASE_PATH}/login`.replace(/\/+/g, '/')
      if (!path.endsWith('/login'))
        window.location.href = loginPath
    }
    window.addEventListener('tms-unauthorized', onUnauthorized)
    return () => window.removeEventListener('tms-unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setBooting(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) setBooting(false)
    }, 15000)

    authApi.me({ timeout: 30000 })
      .then((res) => { if (!cancelled) setUser(mapProfile(res)) })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
        clearTimeout(timer)
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    if (!username?.trim() || !password?.trim()) {
      return { ok: false, error: 'Please enter username and password.' }
    }
    try {
      localStorage.removeItem(BRANCH_KEY)
      const res = await authApi.login(username.trim(), password)
      setToken(res.token)
      const profile = mapProfile(res)
      setUser(profile)
      if (res.isPlatformAdmin) {
        localStorage.setItem('tms-company-id', DEMO_COMPANY_ID)
      } else if (res.companyId) {
        localStorage.setItem('tms-company-id', res.companyId)
      } else {
        localStorage.removeItem('tms-company-id')
      }
      if (!res.canAccessAllBranches && res.branchId) {
        localStorage.setItem(BRANCH_KEY, res.branchId)
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message || 'Login failed.' }
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(BRANCH_KEY)
    localStorage.removeItem('tms-company-id')
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!getToken(),
      booting,
      login,
      logout,
    }),
    [user, booting, login, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
