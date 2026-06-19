import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Login from '../../pages/auth/Login'

export default function LoginRoute() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Login />
}
