import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)
const AUTH_KEY = 'tms-auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_KEY)
  }, [user])

  const login = (username, password) => {
    if (!username?.trim() || !password?.trim()) {
      return { ok: false, error: 'Please enter username and password.' }
    }
    const profile = {
      name: username.trim() === 'admin' ? 'Admin User' : username.trim(),
      role: username.trim() === 'admin' ? 'Super Admin' : 'Operator',
      username: username.trim(),
    }
    setUser(profile)
    return { ok: true }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
