import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useSite } from '../../../features/sites'
import { PrintHeader, PrintTitleProvider } from '../PrintHeader'
import { TopBar } from '../TopBar'
import type { SiteContext } from './useCurrentSite'
import styles from './SiteLayout.module.css'

/** Coque des pages d'un site : barre du haut + contenu de la page courante. */
export function SiteLayout() {
  const { siteId = '' } = useParams()
  const { site, loading } = useSite(siteId)

  if (loading) return <p className={styles.status}>Chargement...</p>
  if (!site) return <Navigate to="/sites" replace />

  return (
    <PrintTitleProvider>
      <div className={styles.layout} data-print-flow>
        <PrintHeader siteId={site.id} siteName={site.name} />
        <TopBar siteId={site.id} siteName={site.name} />
        <div className={styles.content} data-print-flow>
          <Outlet context={{ site } satisfies SiteContext} />
        </div>
      </div>
    </PrintTitleProvider>
  )
}
