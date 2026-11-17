import { Navigate } from 'react-router-dom'
import { usePermissions } from '../../../features/auth'
import { useCurrentSite } from './useCurrentSite'

/** Pages d'un site, de la plus utile à la moins utile : la première que l'utilisateur a le droit d'ouvrir devient sa page d'accueil. */
const LANDING_PAGES = [
  { path: 'feuilles', permission: 'sheets.view' },
  { path: 'postes', permission: 'administration.view' },
]

/**
 * Page d'accueil d'un site : redirige vers la première page accessible selon les droits.
 * Les paramètres du projet s'ouvrent sans permission particulière : un compte n'est donc jamais renvoyé hors du site.
 */
export function DefaultSitePage() {
  const site = useCurrentSite()
  const { can } = usePermissions()
  const landing = LANDING_PAGES.find((page) => can(page.permission))
  return <Navigate to={`/sites/${site.id}/${landing?.path ?? 'parametres'}`} replace />
}
