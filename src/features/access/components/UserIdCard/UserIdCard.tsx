import { useEffect, useState } from 'react'
import { Badge, Icon, Logo } from '../../../../components/ui'
import { fetchUserPhoto } from '../../../../services/userProfile'
import type { AccessUser } from '../../types'
import styles from './UserIdCard.module.css'

interface UserIdCardProps {
  user: AccessUser
  onOpen: () => void
  onEdit?: () => void
  onDeactivate?: () => void
}

/** Un utilisateur présenté comme une carte d'identité : photo à gauche, état civil à droite. */
export function UserIdCard({ user, onOpen, onEdit, onDeactivate }: UserIdCardProps) {
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    fetchUserPhoto(user.id)
      .then((blob) => {
        if (cancelled || !blob) return
        url = URL.createObjectURL(blob)
        setPhoto(url)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [user.id])

  return (
    <article className={`${styles.card} ${user.active ? '' : styles.inactive}`}>
      <header className={styles.head}>
        <Logo size={20} />
        <span className={styles.kind}>Carte professionnelle</span>
      </header>

      <div className={styles.body}>
        <button type="button" className={styles.photo} onClick={onOpen} title="Paramètres et droits" aria-label={`Ouvrir ${user.name}`}>
          {photo ? <img src={photo} alt={`Photo de ${user.name}`} /> : <Icon name="account" size={56} color="var(--color-border)" />}
        </button>
        <dl className={styles.fields}>
          <div>
            <dt>Nom</dt>
            <dd className={styles.name}>{user.name}</dd>
          </div>
          <div>
            <dt>Matricule</dt>
            <dd className={styles.mono}>{user.matricule}</dd>
          </div>
          <div>
            <dt>Fonction</dt>
            <dd>{user.roleAccessName ?? '—'}</dd>
          </div>
          <div>
            <dt>Site</dt>
            <dd>{user.siteName ?? (user.profile === 1 ? 'Tous les sites' : '—')}</dd>
          </div>
        </dl>
      </div>

      <footer className={styles.foot}>
        <span className={styles.mono}>@{user.identifier}</span>
        <Badge tone={user.active ? 'success' : 'neutral'} size="sm">
          {user.active ? 'Actif' : 'Désactivé'}
        </Badge>
        <span className={styles.actions}>
          {onEdit && (
            <button type="button" onClick={onEdit} aria-label="Modifier" title="Modifier">
              <Icon name="edit" size={16} color="var(--color-primary)" />
            </button>
          )}
          {onDeactivate && (
            <button type="button" onClick={onDeactivate} aria-label="Désactiver" title="Désactiver">
              <Icon name="trash" size={16} color="var(--color-danger)" />
            </button>
          )}
        </span>
      </footer>
    </article>
  )
}
