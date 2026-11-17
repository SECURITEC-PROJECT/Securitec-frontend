import { Badge, SiteLogo } from '../../../../components/ui'
import { SITE_TYPES } from '../../constants'
import type { Site } from '../../types'
import styles from './SiteCard.module.css'

interface SiteCardProps {
  site: Site
  onClick: () => void
}

/** Carte d'un site : abréviation en grand, nom, type et accès au site. */
export function SiteCard({ site, onClick }: SiteCardProps) {
  const type = SITE_TYPES[site.type]

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.visual}>
        <SiteLogo siteId={site.id} fill fallback={<span className={styles.code}>{site.code}</span>} />
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{site.name}</span>
        <span className={styles.meta}>
          <Badge tone={type.tone} size="sm">
            {type.label}
          </Badge>
          <span className={styles.open}>Ouvrir →</span>
        </span>
      </span>
    </button>
  )
}
