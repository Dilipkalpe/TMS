import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useSubscription } from '../../context/SubscriptionContext'

export default function TenantGuard({ children }) {
  const { user } = useAuth()
  const { needsCompanySelection } = useCompany()
  const { canAccessPath } = useSubscription()
  const location = useLocation()
  const path = location.pathname

  if (user?.isPlatformAdmin && needsCompanySelection && !path.startsWith('/platform')) {
    return <Navigate to="/platform" replace state={{ reason: 'select-company' }} />
  }

  if (!canAccessPath(path)) {
    return <Navigate to="/" replace />
  }

  return children
}
