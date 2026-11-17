import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>.')
  return context
}

/** Utilisateur connecté ; à n'utiliser que sous une route protégée par <RequireAuth>. */
export function useCurrentUser() {
  const { user } = useAuth()
  if (!user) throw new Error('Aucun utilisateur connecté.')
  return user
}

/** Contrôle des droits dans l'interface : `can('instructions.create')`. */
export function usePermissions() {
  const { can, canAny } = useAuth()
  return { can, canAny }
}
