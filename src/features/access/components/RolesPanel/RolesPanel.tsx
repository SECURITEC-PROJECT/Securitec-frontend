import { useState } from 'react'
import { Badge, Button, Icon } from '../../../../components/ui'
import { usePermissions } from '../../../auth'
import { useCatalog } from '../../hooks/useCatalog'
import type { useRoles } from '../../hooks/useRoles'
import type { RoleInput, RoleSummary } from '../../types'
import { RoleEditor } from '../RoleEditor'
import type { RoleTarget } from '../RoleEditor'
import styles from './RolesPanel.module.css'

/** Colonne « Rôles et permissions » : liste compacte des rôles, l'édition s'ouvre dans la fenêtre habituelle. */
export function RolesPanel({ roles, loading, error, create, update, remove }: ReturnType<typeof useRoles>) {
  const { can } = usePermissions()
  const { catalog, error: catalogError } = useCatalog()
  const [target, setTarget] = useState<RoleTarget | null>(null)
  const [actionError, setActionError] = useState('')

  const handleSave = async (id: string | null, input: RoleInput) => {
    if (id) await update(id, input)
    else await create(input)
    setTarget(null)
  }

  const handleDelete = async (role: RoleSummary) => {
    if (!window.confirm(`Supprimer le rôle « ${role.nom} » ?`)) return
    setActionError('')
    try {
      await remove(role.id)
      setTarget(null)
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Suppression impossible.')
    }
  }

  return (
    <aside className={styles.panel}>
      <header className={styles.head}>
        <Icon name="shield" size={18} color="#d32f2f" />
        <h2>Rôles et permissions</h2>
      </header>
      <p className={styles.hint}>Un rôle regroupe les permissions de ceux qui le portent.</p>

      {(error || catalogError || actionError) && <p className={styles.error}>{error || catalogError || actionError}</p>}
      {loading && <p className={styles.status}>Chargement...</p>}

      <ul className={styles.list}>
        {roles.map((role) => (
          <li key={role.id}>
            <button type="button" className={styles.row} onClick={() => setTarget({ mode: 'edit', role })} title={role.description ?? undefined}>
              <span className={styles.name}>{role.nom}</span>
              <span className={styles.meta}>
                {role.permissionCount} perm. · {role.userCount} util.
              </span>
              {role.system && (
                <Badge tone="neutral" size="sm">
                  Système
                </Badge>
              )}
            </button>
          </li>
        ))}
      </ul>

      {can('roles.create') && (
        <Button type="button" variant="secondary" onClick={() => setTarget({ mode: 'new' })}>
          Nouveau rôle
        </Button>
      )}

      {catalog && (
        <RoleEditor
          target={target}
          catalog={catalog}
          canUpdate={can('roles.update')}
          canDelete={can('roles.delete')}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setTarget(null)}
        />
      )}
    </aside>
  )
}
