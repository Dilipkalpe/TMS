import { createContext, useContext, useEffect, useState } from 'react'
import { driverPortalApi, getDriverToken, setDriverToken } from '../services/api'
import { APP_BASE_PATH } from '../config/api'

const DriverAuthContext = createContext(null)

export function DriverAuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(!!getDriverToken())

  useEffect(() => {
    const onUnauthorized = () => {
      setDriverToken(null)
      setProfile(null)
      const loginPath = `${APP_BASE_PATH}/driver/login`.replace(/\/+/g, '/')
      if (!window.location.pathname.includes('/driver/login'))
        window.location.href = loginPath
    }
    window.addEventListener('tms-driver-unauthorized', onUnauthorized)
    return () => window.removeEventListener('tms-driver-unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (!getDriverToken()) {
      setBooting(false)
      return
    }
    driverPortalApi.me()
      .then(setProfile)
      .catch(() => {
        setDriverToken(null)
        setProfile(null)
      })
      .finally(() => setBooting(false))
  }, [])

  const login = async (phone, pin) => {
    const res = await driverPortalApi.login(phone, pin)
    setProfile({ name: res.name, driverId: res.driverId, companyId: res.companyId })
    return res
  }

  const logout = () => {
    driverPortalApi.logout()
    setProfile(null)
  }

  return (
    <DriverAuthContext.Provider value={{
      profile,
      isAuthenticated: !!profile && !!getDriverToken(),
      booting,
      login,
      logout,
    }}>
      {children}
    </DriverAuthContext.Provider>
  )
}

export function useDriverAuth() {
  const ctx = useContext(DriverAuthContext)
  if (!ctx) throw new Error('useDriverAuth must be used within DriverAuthProvider')
  return ctx
}
