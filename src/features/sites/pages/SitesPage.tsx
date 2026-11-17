import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserMenu } from '../../../components/layout/UserMenu'
import { Logo } from '../../../components/ui'
import { useCurrentUser, usePermissions } from '../../auth'
import { AddSiteModal } from '../components/AddSiteModal'
import { SiteGrid } from '../components/SiteGrid'
import { useSites } from '../hooks/useSites'
import type { NewSite } from '../types'
import { pluralize } from '../utils'
import styles from './SitesPage.module.css'

/** Liste des sites et création d'un nouveau site. */
export function SitesPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { can } = usePermissions()
  const { sites, loading, error, addSite } = useSites()
  const [modalOpen, setModalOpen] = useState(false)

  const handleCreate = async (input: NewSite) => {
    await addSite(input)
    setModalOpen(false)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Logo size={44} />
        <div className={styles.headerActions}>
          <UserMenu />
        </div>
      </header>

      <section className={styles.content}>
        <div>
          <h1>Bonjour, {user.name}</h1>
          <p className={styles.subtitle}>{loading ? 'Chargement…' : pluralize(sites.length, 'site')}</p>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {!loading && (
          <>
            <SiteGrid sites={sites} onSelect={(site) => navigate(`/sites/${site.id}`)} onCreate={can('administration.create') ? () => setModalOpen(true) : undefined} />
            {sites.length === 0 && <p className={styles.status}>Aucun site accessible pour le moment.</p>}
          </>
        )}
      </section>

      <footer className={styles.footer}>SECURITEC</footer>
      <AddSiteModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </main>
  )
}
