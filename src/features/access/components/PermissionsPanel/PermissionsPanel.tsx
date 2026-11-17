import { useEffect, useRef, useState } from 'react'
import { Icon, SlidePanel, Switch } from '../../../../components/ui'
import { fetchUserPermissions, saveUserPermissions } from '../../../../services/access'
import type { UserPermissions } from '../../../../services/access'
import { useCurrentUser, usePermissions } from '../../../auth'
import { useCatalog } from '../../hooks/useCatalog'
import { moduleState, permissionKey, setModule, toggleAction } from '../../permissionTree'
import type { AccessUser, PermissionModule } from '../../types'
import styles from './PermissionsPanel.module.css'

interface PermissionsPanelProps {
  user: AccessUser
  open: boolean
  onClose: () => void
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const asSwitch = (state: 'all' | 'some' | 'none') => (state === 'all' ? 'on' : state === 'some' ? 'partial' : 'off')

/** Panneau « Permissions (nom) » : un interrupteur par module (tout activer / tout retirer), dépliable action par action. Chaque changement est enregistré. */
export function PermissionsPanel({ user, open, onClose }: PermissionsPanelProps) {
  return (
    <SlidePanel title={`Permissions (${user.name})`} open={open} onClose={onClose} width={400}>
      <PermissionsEditor key={user.id} user={user} />
    </SlidePanel>
  )
}

function PermissionsEditor({ user }: { user: AccessUser }) {
  const { can } = usePermissions()
  const me = useCurrentUser()
  const { catalog, error: catalogError } = useCatalog()
  const [data, setData] = useState<UserPermissions>()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Une seule écriture à la fois : si on bascule plusieurs interrupteurs vite, seule la dernière valeur est envoyée ensuite.
  const inFlight = useRef(false)
  const queued = useRef<Set<string> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchUserPermissions(user.id)
      .then((loaded) => {
        if (cancelled) return
        setData(loaded)
        setSelected(new Set(loaded.effective))
      })
      .catch((failure: Error) => !cancelled && setError(failure.message))
    return () => {
      cancelled = true
    }
  }, [user.id])

  if (error && !data) return <p className={styles.error}>{error}</p>
  if (!data || !catalog) return <p className={styles.status}>{catalogError || 'Chargement...'}</p>

  const isAdmin = data.profile === 1
  const isSelf = user.id === me.id
  const editable = can('users.update') && !isAdmin && !isSelf
  const allPermissions = catalog.groups.flatMap((group) => group.modules.flatMap((module) => module.actions.map((action) => permissionKey(module, action))))

  const persist = async (next: Set<string>) => {
    if (inFlight.current) {
      queued.current = next
      return
    }
    inFlight.current = true
    setStatus('saving')
    setError('')
    try {
      const saved = await saveUserPermissions(user.id, [...next])
      setData(saved)
      // Si d'autres changements sont arrivés pendant l'écriture, ils restent affichés et sont envoyés juste après.
      if (!queued.current) setSelected(new Set(saved.effective))
      setStatus('saved')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
      setSelected(new Set(data.effective))
      queued.current = null
      setStatus('idle')
    } finally {
      inFlight.current = false
      const following = queued.current
      queued.current = null
      if (following) void persist(following)
    }
  }

  const change = (next: Set<string>) => {
    setSelected(next)
    void persist(next)
  }

  const allOn = allPermissions.every((permission) => selected.has(permission))
  const base = new Set(data.rolePermissions)
  const added = [...selected].filter((permission) => !base.has(permission)).length
  const removed = data.rolePermissions.filter((permission) => !selected.has(permission)).length
  const search = normalize(query.trim())
  const toggleExpanded = (key: string) => setExpanded((current) => (current.has(key) ? new Set([...current].filter((item) => item !== key)) : new Set(current).add(key)))

  const moduleRow = (module: PermissionModule) => {
    const open = expanded.has(module.key)
    return (
      <li key={module.key} className={styles.module}>
        <div className={styles.row}>
          <Icon name="shield" size={18} color="var(--color-info)" />
          <span className={styles.label}>{module.label}</span>
          <Switch label={module.label} state={asSwitch(moduleState(selected, module))} disabled={!editable} onChange={() => change(setModule(selected, module, moduleState(selected, module) !== 'all'))} />
          <button type="button" className={styles.chevron} onClick={() => toggleExpanded(module.key)} aria-expanded={open} aria-label={`Détail : ${module.label}`}>
            <Icon name={open ? 'down' : 'next'} size={18} color="var(--color-muted)" />
          </button>
        </div>
        {open && (
          <ul className={styles.actions}>
            {module.actions.map((action) => (
              <li key={action} className={styles.row}>
                <span className={styles.label}>{catalog.actions[action]}</span>
                <Switch
                  label={`${catalog.actions[action]} : ${module.label}`}
                  state={selected.has(permissionKey(module, action)) ? 'on' : 'off'}
                  disabled={!editable}
                  onChange={() => change(toggleAction(selected, module, action))}
                />
              </li>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className={styles.panel}>
      <p className={styles.note}>
        {isAdmin
          ? 'Administrateur : accès total, qui ne peut pas être restreint.'
          : isSelf
            ? 'Vous ne pouvez pas modifier vos propres permissions.'
            : `Base : rôle « ${data.roleName ?? '—'} » (${base.size} droits)${added || removed ? ` · +${added} accordé(s), −${removed} retiré(s)` : ''}.`}
        {status === 'saving' && ' Enregistrement…'}
        {status === 'saved' && ' Enregistré.'}
      </p>
      {error && <p className={styles.error}>{error}</p>}

      <div className={`${styles.row} ${styles.all}`}>
        <Icon name="key" size={20} color="var(--color-muted)" />
        <span className={styles.label}>Toutes les permissions</span>
        <Switch label="Toutes les permissions" state={allOn ? 'on' : selected.size > 0 ? 'partial' : 'off'} disabled={!editable} onChange={() => change(allOn ? new Set() : new Set(allPermissions))} />
      </div>

      <input className={styles.search} type="search" placeholder="Rechercher ..." value={query} onChange={(event) => setQuery(event.target.value)} />

      {editable && (added > 0 || removed > 0) && (
        <button type="button" className={styles.reset} onClick={() => change(new Set(data.rolePermissions))}>
          Revenir aux droits du rôle
        </button>
      )}

      {catalog.groups.map((group) => {
        const modules = group.modules.filter((module) => !search || normalize(module.label).includes(search))
        if (modules.length === 0) return null
        return (
          <section key={group.key}>
            <h3 className={styles.group}>{group.label}</h3>
            <ul className={styles.list}>{modules.map(moduleRow)}</ul>
          </section>
        )
      })}
    </div>
  )
}
