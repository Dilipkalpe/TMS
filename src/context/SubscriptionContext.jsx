import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { PLAN_MODULES, createSubscriptionAccess } from '../utils/subscriptionAccess'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const value = useMemo(() => ({
    ...createSubscriptionAccess(user),
    PLAN_MODULES,
  }), [user?.features, user?.planCode, user?.isPlatformAdmin, user?.role])

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}

export { PLAN_MODULES, createSubscriptionAccess }
