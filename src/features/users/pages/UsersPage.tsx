import { PageHeader } from '../../../components/layout/PageHeader'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { Badge } from '../../../components/ui'
import { useSiteUsers } from '../hooks/useSiteUsers'
import styles from './UsersPage.module.css'

/** Liste des utilisateurs du site courant. */
export function UsersPage() {
  const site = useCurrentSite()
  const { users, loading, error } = useSiteUsers(site.id)

  return (
    <div className={styles.page}>
      <PageHeader title="Utilisateurs" subtitle={loading ? 'Chargement…' : `${users.length} utilisateur${users.length > 1 ? 's' : ''} sur ${site.name}`} />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Matricule</th>
              <th>Identifiant</th>
              <th>Rôle</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={user.active ? '' : styles.inactive}>
                <td className={styles.name}>{user.name}</td>
                <td>{user.matricule}</td>
                <td>{user.identifier}</td>
                <td>{user.roleName}</td>
                <td>
                  <Badge tone={user.active ? 'success' : 'neutral'} size="sm">
                    {user.active ? 'Actif' : 'Désactivé'}
                  </Badge>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  Aucun utilisateur sur ce site.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
