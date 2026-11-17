import { useMemo, useState } from 'react'
import { groupState, moduleState, permissionKey, setGroup, setModule, toggleAction } from '../../permissionTree'
import type { CheckState } from '../../permissionTree'
import type { PermissionCatalog } from '../../types'
import styles from './PermissionMatrix.module.css'

interface PermissionMatrixProps {
  catalog: PermissionCatalog
  selected: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}

function TriCheckbox({ state, onChange, disabled, label }: { state: CheckState; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <input
      type="checkbox"
      className={styles.check}
      checked={state === 'all'}
      ref={(element) => {
        if (element) element.indeterminate = state === 'some'
      }}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
  )
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Arbre de permissions : groupes → modules → actions, avec coche globale à chaque niveau. */
export function PermissionMatrix({ catalog, selected, onChange, disabled }: PermissionMatrixProps) {
  const [query, setQuery] = useState('')
  const actionKeys = useMemo(() => Object.keys(catalog.actions), [catalog])
  const search = normalize(query.trim())

  return (
    <div className={styles.matrix}>
      <input
        className={styles.search}
        type="search"
        placeholder="Rechercher un module..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Module</th>
            {actionKeys.map((action) => (
              <th key={action} className={styles.action}>
                {catalog.actions[action]}
              </th>
            ))}
            <th className={styles.action}>Tout</th>
          </tr>
        </thead>
        <tbody>
          {catalog.groups.map((group) => {
            const modules = group.modules.filter((module) => !search || normalize(module.label).includes(search))
            if (modules.length === 0) return null
            return [
              <tr key={group.key} className={styles.group}>
                <td colSpan={actionKeys.length + 1}>{group.label}</td>
                <td className={styles.action}>
                  <TriCheckbox
                    state={groupState(selected, group)}
                    disabled={disabled}
                    label={`Tout ${group.label}`}
                    onChange={() => onChange(setGroup(selected, group, groupState(selected, group) !== 'all'))}
                  />
                </td>
              </tr>,
              ...modules.map((module) => (
                <tr key={module.key}>
                  <td>{module.label}</td>
                  {actionKeys.map((action) => (
                    <td key={action} className={styles.action}>
                      {module.actions.includes(action) && (
                        <input
                          type="checkbox"
                          className={styles.check}
                          checked={selected.has(permissionKey(module, action))}
                          onChange={() => onChange(toggleAction(selected, module, action))}
                          disabled={disabled}
                          aria-label={`${catalog.actions[action]} : ${module.label}`}
                        />
                      )}
                    </td>
                  ))}
                  <td className={styles.action}>
                    <TriCheckbox
                      state={moduleState(selected, module)}
                      disabled={disabled}
                      label={`Tout : ${module.label}`}
                      onChange={() => onChange(setModule(selected, module, moduleState(selected, module) !== 'all'))}
                    />
                  </td>
                </tr>
              )),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
