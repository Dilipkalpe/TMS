import { Navigate } from 'react-router-dom'
import { useDriverAuth } from '../../context/DriverAuthContext'

export default function DriverProtectedRoute({ children }) {
  const { isAuthenticated, booting } = useDriverAuth()
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading…
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/driver/login" replace />
  return children
}
