import { useLocation } from 'react-router-dom'
import { useCurrentUser } from '../../../features/auth'
import { Logo, SiteLogo } from '../../ui'
import { usePrintTitleValue } from './usePrintTitle'
import styles from './PrintHeader.module.css'

interface PrintHeaderProps {
  /** Site ouvert : absent dans l'administration (utilisateurs, rôles), qui n'est liée à aucun site. */
  siteId?: string
  siteName?: string
}

const SITE_PAGES: Record<string, string> = {
  utilisateurs: 'Utilisateurs',
  postes: 'Postes de garde',
  feuilles: 'Feuilles de saisie',
  'comptes-rendus': 'Comptes rendus',
  parametres: 'Paramètres du site',
}

/** Titre de la page imprimée, déduit de l'adresse. */
function pageTitle(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] === 'admin') {
    if (segments[1] === 'roles') return 'Rôles et permissions'
    return segments[2] ? 'Paramètres de l’utilisateur' : 'Utilisateurs'
  }
  const page = segments[2]
  if (!page) return 'SECURITEC'
  if (page === 'postes' && segments[3]) return segments[4] === 'feuilles' ? 'Colonnes de la feuille de saisie' : 'Paramètres du poste de garde'
  if (page === 'feuilles' && segments[3]) return 'Feuille de saisie'
  return SITE_PAGES[page] ?? 'SECURITEC'
}

const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/**
 * En-tête et pied de page visibles seulement à l'impression : logo SECURITEC, titre de la page, site, date et heure d'impression, utilisateur.
 * Le reste de l'interface (barre du haut, menus, boutons) est masqué par la feuille d'impression globale.
 */
export function PrintHeader({ siteId, siteName }: PrintHeaderProps) {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  // Une page peut imposer son titre (le nom de la feuille de saisie) ; sinon il est déduit de l'adresse.
  const title = usePrintTitleValue() ?? pageTitle(pathname)
  const now = new Date()

  return (
    <>
      <div className={styles.header} data-print-only>
        <Logo size={54} />
        <div className={styles.brand}>
          <strong>SECURITEC</strong>
          <span>Digitalisation du poste de garde</span>
        </div>
        <div className={styles.title}>
          <h1 data-plain>{title}</h1>
          {siteId && siteName && (
            <span className={styles.site}>
              <SiteLogo siteId={siteId} size={22} fallback={null} />
              {siteName}
            </span>
          )}
        </div>
        <div className={styles.meta}>
          <span>Imprimé le {formatDate(now)}</span>
          <span>à {formatTime(now)}</span>
          <span>par {user.name}</span>
        </div>
      </div>
      <div className={styles.footer} data-print-only>
        SECURITEC{siteName ? ` · ${siteName}` : ''} · document imprimé le {formatDate(now)} à {formatTime(now)}
      </div>
    </>
  )
}
