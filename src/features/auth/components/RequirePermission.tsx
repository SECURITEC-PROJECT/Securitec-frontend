import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { usePermissions } from '../hooks/useAuth'

/**
 * Réserve une page à ceux qui détiennent la permission. Les autres retournent à l'accueil du site s'ils y travaillent
 * (qui les mène à une page autorisée), sinon à la liste des sites.
 */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = usePermissions()
  const { siteId } = useParams()
  return can(permission) ? children : <Navigate to={siteId ? `/sites/${siteId}` : '/sites'} replace />
}
