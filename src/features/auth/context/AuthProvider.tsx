import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getToken, setToken, setUnauthorizedHandler } from '../../../lib/api'
import { SESSION_STORAGE_KEY } from '../constants'
import { fetchSession, login as requestLogin } from '../services/authService'
import type { LoginCredentials, SessionUser } from '../types'
import { AuthContext } from './AuthContext'

function loadSession(): SessionUser | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    return stored && getToken() ? (JSON.parse(stored) as SessionUser) : null
  } catch {
    return null
  }
}

function storeSession(user: SessionUser | null) {
  if (user) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(loadSession)

  const logout = useCallback(() => {
    setToken(null)
    storeSession(null)
    setUser(null)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await requestLogin(credentials)
    setToken(session.token)
    storeSession(session.user)
    setUser(session.user)
  }, [])

  // Session expirée ou compte désactivé : retour à la connexion.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(undefined)
  }, [logout])

  // Au chargement, on rafraîchit le profil et les permissions (modifiés par un administrateur entre-temps).
  useEffect(() => {
    if (!getToken()) return
    fetchSession()
      .then((fresh) => {
        storeSession(fresh)
        setUser(fresh)
      })
      .catch(() => undefined)
  }, [])

  const value = useMemo(() => {
    const granted = new Set(user?.permissions)
    return {
      user,
      login,
      logout,
      can: (permission: string) => granted.has(permission),
      canAny: (permissions: string[]) => permissions.some((permission) => granted.has(permission)),
    }
  }, [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
