import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Login from '../../pages/auth/Login'

export default function LoginRoute() {
  const { isAuthenticated, booting } = useAuth()
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-slate-500">
        Loading…
      </div>
    )
  }
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Login />
}
