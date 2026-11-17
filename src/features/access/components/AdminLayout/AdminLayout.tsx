import { NavLink, Outlet } from 'react-router-dom'
import { PrintHeader } from '../../../../components/layout/PrintHeader'
import { UserMenu } from '../../../../components/layout/UserMenu'
import { Icon } from '../../../../components/ui'
import { usePermissions } from '../../../auth'
import styles from './AdminLayout.module.css'

/** Coque de l'administration : barre d'icônes (comme celle d'un site) pour les sites, les utilisateurs et les rôles. */
export function AdminLayout() {
  const { can } = usePermissions()
  const item = ({ isActive }: { isActive: boolean }) => `${styles.item} ${isActive ? styles.active : ''}`

  return (
    <div className={styles.layout} data-print-flow>
      <PrintHeader />
      <header className={styles.bar} data-print="hide">
        <nav className={styles.nav}>
          <NavLink to="/sites" title="Mes sites" className={styles.item}>
            <Icon name="home" color="#7939b8" size={22} />
          </NavLink>
          {can('users.view') && (
            <NavLink to="/admin/users" title="Utilisateurs, rôles et permissions" className={item}>
              <Icon name="users" color="#1f78c1" size={22} />
            </NavLink>
          )}
          {can('planning.view') && (
            <NavLink to="/admin/planning" title="Planning" className={item}>
              <Icon name="clock" color="#f5a623" size={22} />
            </NavLink>
          )}
        </nav>
        <div className={styles.right}>
          <span className={styles.title}>Gestion Securitec</span>
          <UserMenu />
        </div>
      </header>
      <main className={styles.content} data-print-flow>
        <Outlet />
      </main>
    </div>
  )
}
