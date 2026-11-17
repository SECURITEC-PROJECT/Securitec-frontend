import { Navigate } from 'react-router-dom'
import { usePermissions } from '../../../auth'

/** Page d'accueil de « Gestion Securitec » : la première section que l'utilisateur a le droit d'ouvrir. */
export function AdminHome() {
  const { can } = usePermissions()
  if (can('users.view')) return <Navigate to="/admin/users" replace />
  if (can('planning.view')) return <Navigate to="/admin/planning" replace />
  return <Navigate to="/sites" replace />
}
