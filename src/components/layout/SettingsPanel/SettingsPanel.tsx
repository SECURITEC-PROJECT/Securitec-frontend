import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth'
import { Icon, SlidePanel } from '../../ui'
import type { IconName } from '../../ui'
import styles from './SettingsPanel.module.css'

interface Row {
  icon: IconName
  color: string
  title: string
  subtitle: string
  onClick?: () => void
}

/** Bouton « Paramètres » de la barre du haut et panneau latéral (compte, paramètres du projet, changement de site). */
export function SettingsPanel({ siteId, siteName }: { siteId: string; siteName: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }
  const rows: Row[] = [
    { icon: 'settings', color: '#7939b8', title: 'Paramètres de projet', subtitle: `Gérer les informations et les utilisateurs de ${siteName}`, onClick: () => go(`/sites/${siteId}/parametres`) },
    { icon: 'home', color: '#7939b8', title: 'Changer de site', subtitle: 'Choisir un autre site de travail', onClick: () => go('/sites') },
    // « Gestion Securitec » : réservée à l'administrateur (profil 1) et à la direction (profil 4).
    ...(user.profile === 1 || user.profile === 4
      ? [{ icon: 'shield' as const, color: '#d32f2f', title: 'Gestion Securitec', subtitle: 'Utilisateurs, rôles et permissions de l’agence', onClick: () => go('/admin') }]
      : []),
  ]

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)} title="Paramètres" aria-label="Paramètres">
        <Icon name="settings" size={22} color="var(--color-muted)" />
      </button>
      <SlidePanel title="Paramètres" open={open} onClose={() => setOpen(false)} width={340}>
        <div className={styles.list}>
          <div className={styles.row}>
            <Icon name="account" size={26} color="var(--color-muted)" />
            <div className={styles.text}>
              <strong>{user.name}</strong>
              <span>
                {user.identifier} · {user.roleLabel}
              </span>
            </div>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>

          {rows.map((row) => (
            <button key={row.title} type="button" className={`${styles.row} ${styles.clickable}`} onClick={row.onClick}>
              <Icon name={row.icon} size={24} color={row.color} />
              <div className={styles.text}>
                <strong>{row.title}</strong>
                <span>{row.subtitle}</span>
              </div>
              <Icon name="next" size={18} color="var(--color-muted)" />
            </button>
          ))}
        </div>
        <p className={styles.footer}>
          SECURITEC · gestion de la sécurité des sites.
          <br />
          Les permissions affichées dépendent de votre rôle.
        </p>
      </SlidePanel>
    </>
  )
}
