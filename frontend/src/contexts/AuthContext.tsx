import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType>(null!)

// Chave antiga: o JWT ficava em localStorage antes da sessão em cookie httpOnly.
const LEGACY_TOKEN_KEY = 'token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try { localStorage.removeItem(LEGACY_TOKEN_KEY) } catch { /* ignore */ }
    // A sessão vive num cookie httpOnly: o único jeito de saber se há login é perguntar ao backend.
    authApi.me()
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    await authApi.login(email, password) // o backend grava o cookie de sessão
    const me = await authApi.me()
    setUser(me.data)
  }

  const logout = async () => {
    setUser(null)
    try {
      await authApi.logout()
    } catch {
      // Sem rede: o cookie expira sozinho; o estado local já foi limpo.
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
