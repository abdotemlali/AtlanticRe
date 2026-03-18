import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import api from '../utils/api'

export type UserRole = 'admin' | 'souscripteur' | 'lecteur'

export interface AuthUser {
  username: string
  full_name: string
  role: UserRole
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  can: (permission: 'export' | 'modify_scoring' | 'admin') => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('auth_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const res = await api.post('/auth/login', { username, password })
    const userData = res.data.user

    if (userData.must_change_password) {
      // Signale au composant appelant qu'une redirection est requise
      // via l'intercepteur API ou manuellement
      return true
    }

    const authUser: AuthUser = {
      username: userData.username,
      full_name: userData.full_name,
      role: userData.role
    }

    localStorage.setItem('auth_user', JSON.stringify(authUser))
    setUser(authUser)

    return false
  }, [])

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => { })
    localStorage.removeItem('auth_user')
    setUser(null)
    window.location.href = '/login'
  }, [])

  const can = useCallback(
    (permission: 'export' | 'modify_scoring' | 'admin') => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (permission === 'export' || permission === 'modify_scoring') {
        return user.role === 'souscripteur'
      }
      return false
    },
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
