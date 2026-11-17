import type { Site } from '../../types'
import { NewSiteCard } from '../NewSiteCard'
import { SiteCard } from '../SiteCard'
import styles from './SiteGrid.module.css'

interface SiteGridProps {
  sites: Site[]
  onSelect: (site: Site) => void
  /** Absent si l'utilisateur ne peut pas créer de site : la carte « Nouveau site » n'est alors pas affichée. */
  onCreate?: () => void
}

export function SiteGrid({ sites, onSelect, onCreate }: SiteGridProps) {
  return (
    <div className={styles.grid}>
      {onCreate && <NewSiteCard onClick={onCreate} />}
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} onClick={() => onSelect(site)} />
      ))}
    </div>
  )
}
