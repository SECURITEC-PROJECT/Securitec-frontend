import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { Icon } from '../../../components/ui'
import { useCurrentUser } from '../../auth'
import { fetchSiteSheets } from '../services/sheets'
import type { Sheet } from '../types'
import styles from './SheetPages.module.css'

/** Toutes les feuilles de saisie du site, regroupées par poste de garde. */
export function SheetsPage() {
  const site = useCurrentSite()
  const isAdmin = useCurrentUser().profile === 1
  const [sheets, setSheets] = useState<Sheet[]>()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchSiteSheets(site.id)
      .then((loaded) => !cancelled && setSheets(loaded))
      .catch((failure: Error) => {
        if (cancelled) return
        setError(failure.message)
        setSheets([])
      })
    return () => {
      cancelled = true
    }
  }, [site.id])

  const byPost = new Map<string, Sheet[]>()
  for (const sheet of sheets ?? []) byPost.set(sheet.postName, [...(byPost.get(sheet.postName) ?? []), sheet])

  return (
    <div className={styles.page}>
      <PageHeader title="Feuilles de saisie" subtitle={isAdmin ? `Toutes les feuilles de saisie des postes de garde de ${site.name}.` : `Les feuilles de saisie des postes de garde de ${site.name} auxquels vous êtes affecté.`} />
      {error && <p className={styles.error}>{error}</p>}
      {sheets === undefined && <p className={styles.status}>Chargement...</p>}
      {sheets?.length === 0 && !error && (
        <p className={styles.status}>
          Aucune feuille à afficher. Les feuilles de saisie ne sont visibles que par les utilisateurs affectés au poste de garde : vérifiez qu'un poste vous est affecté et qu'il a des feuilles (paramètres du poste, carte « Feuilles de saisie »).
        </p>
      )}
      {[...byPost.entries()].map(([postName, list]) => (
        <section key={postName} className={styles.group}>
          <h2 className={styles.groupTitle}>{postName}</h2>
          <div className={styles.grid}>
            {list.map((sheet) => (
              <Link key={sheet.id} to={`/sites/${site.id}/feuilles/${sheet.id}`} className={styles.sheetCard}>
                <Icon name="clipboard" size={22} color="#2e9e6a" />
                <span className={styles.sheetName}>{sheet.name}</span>
                <small>{sheet.columns.length} colonne{sheet.columns.length > 1 ? 's' : ''}</small>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
