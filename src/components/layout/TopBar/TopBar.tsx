import { NavLink } from 'react-router-dom'
import { usePermissions } from '../../../features/auth'
import { Icon } from '../../ui'
import type { IconName } from '../../ui'
import { NotificationBell } from '../../../features/notifications/components/NotificationBell'
import { SettingsPanel } from '../SettingsPanel'
import styles from './TopBar.module.css'

interface NavItem {
  label: string
  icon: IconName
  color: string
  path: string
  permission: string
}

const NAV: NavItem[] = [
  { label: 'Feuilles de saisie', icon: 'clipboard', color: '#2e9e6a', path: 'feuilles', permission: 'sheets.view' },
  { label: 'Comptes rendus', icon: 'report', color: '#2f7fd8', path: 'comptes-rendus', permission: 'minutes.view' },
  { label: 'Postes de garde', icon: 'post', color: '#f5a623', path: 'postes', permission: 'administration.view' },
]

/** Barre du haut d'un site : retour à la liste des sites, pages du site (selon les droits) et paramètres. */
export function TopBar({ siteId, siteName }: { siteId: string; siteName: string }) {
  const { can } = usePermissions()

  return (
    <header className={styles.bar} data-print="hide">
      <nav className={styles.nav}>
        <NavLink to="/sites" title="Mes sites" className={styles.item}>
          <Icon name="home" color="#7939b8" size={22} />
        </NavLink>
        {NAV.filter((item) => can(item.permission)).map((item) => (
          <NavLink
            key={item.path}
            to={`/sites/${siteId}/${item.path}`}
            title={item.label}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
          >
            <Icon name={item.icon} color={item.color} size={22} />
          </NavLink>
        ))}
      </nav>
      <div className={styles.right}>
        <span className={styles.siteName}>{siteName}</span>
        <NotificationBell />
        <SettingsPanel siteId={siteId} siteName={siteName} />
      </div>
    </header>
  )
}
