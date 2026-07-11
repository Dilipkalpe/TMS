import { Navigate, useLocation } from 'react-router-dom'
import { usePortalAuth } from '../../context/PortalAuthContext'

export default function PortalProtectedRoute({ children }) {
  const { isAuthenticated, booting } = usePortalAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace state={{ from: location }} />
  }

  return children
}
