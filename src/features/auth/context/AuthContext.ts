import { createContext } from 'react'
import type { LoginCredentials, SessionUser } from '../types'

export interface AuthContextValue {
  user: SessionUser | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  /** Vrai si l'utilisateur connecté détient la permission (ex. « instructions.create »). */
  can: (permission: string) => boolean
  /** Vrai s'il détient au moins une des permissions. */
  canAny: (permissions: string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
