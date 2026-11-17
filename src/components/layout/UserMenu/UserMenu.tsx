import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import { apiBlob } from '../../../lib/api'
import { Badge, Icon } from '../../ui'
import styles from './UserMenu.module.css'

/** Initiales (deux lettres au plus) affichées quand la personne n'a pas de photo. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

/**
 * Compte connecté : sa photo de profil dans un rond (pastille verte « en ligne »). Au survol, au clic ou au clavier,
 * une carte affiche le nom, le rôle, l'état de la connexion et le bouton de déconnexion.
 */
export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let url: string | null = null
    apiBlob('/auth/me/photo')
      .then((blob) => {
        if (cancelled) return
        url = blob ? URL.createObjectURL(blob) : null
        setPhoto(url)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [userId])

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={styles.menu}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
    >
      <button type="button" className={styles.avatar} onClick={() => setOpen((value) => !value)} aria-haspopup="true" aria-expanded={open} aria-label={`Compte de ${user.name}`}>
        {photo ? <img src={photo} alt="" /> : <span className={styles.initials}>{initials(user.name) || <Icon name="account" size={22} color="var(--color-muted)" />}</span>}
        <span className={`${styles.dot} ${online ? styles.online : styles.offline}`} aria-hidden />
      </button>

      {open && (
        <div className={styles.popover} role="menu">
          <div className={styles.identity}>
            <strong className={styles.name}>{user.name}</strong>
            <span className={styles.role}>{user.roleLabel}</span>
            <Badge tone={online ? 'success' : 'warning'} size="sm">
              {online ? 'En ligne' : 'Hors ligne'}
            </Badge>
          </div>
          <button type="button" role="menuitem" className={styles.logout} onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
