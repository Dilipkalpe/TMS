import { createContext, useContext, useEffect, useState } from 'react'
import { getPortalToken, portalApi, setPortalToken } from '../services/api'
import { APP_BASE_PATH } from '../config/api'

const PortalAuthContext = createContext(null)

export function PortalAuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(!!getPortalToken())

  useEffect(() => {
    const onUnauthorized = () => {
      setPortalToken(null)
      setProfile(null)
      const loginPath = `${APP_BASE_PATH}/portal/login`.replace(/\/+/g, '/')
      if (!window.location.pathname.includes('/portal/login'))
        window.location.href = loginPath
    }
    window.addEventListener('tms-portal-unauthorized', onUnauthorized)
    return () => window.removeEventListener('tms-portal-unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (!getPortalToken()) {
      setBooting(false)
      return
    }
    portalApi.me()
      .then(setProfile)
      .catch(() => {
        setPortalToken(null)
        setProfile(null)
      })
      .finally(() => setBooting(false))
  }, [])

  const login = async (phone, pin) => {
    const res = await portalApi.login(phone, pin)
    setProfile({ name: res.name, scope: res.scope, customerId: res.customerId, bookingId: res.bookingId })
    return res
  }

  const trackLogin = async (bookingId, phone) => {
    const res = await portalApi.trackLogin(bookingId, phone)
    setProfile({ name: res.name, scope: res.scope, customerId: res.customerId, bookingId: res.bookingId })
    return res
  }

  const logout = () => {
    portalApi.logout()
    setProfile(null)
  }

  return (
    <PortalAuthContext.Provider value={{
      profile,
      isAuthenticated: !!profile && !!getPortalToken(),
      booting,
      login,
      trackLogin,
      logout,
    }}>
      {children}
    </PortalAuthContext.Provider>
  )
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext)
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider')
  return ctx
}
