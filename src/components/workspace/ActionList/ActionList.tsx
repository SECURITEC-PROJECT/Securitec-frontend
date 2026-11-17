import { Icon } from '../../ui'
import type { IconName } from '../../ui'
import { arrange, useSidebarCustomization } from '../WorkspaceSidebar/customization'
import { ItemControls } from '../WorkspaceSidebar/ItemControls'
import styles from './ActionList.module.css'

export interface ActionItem {
  icon: IconName
  color: string
  label: string
  /** Absent = action indisponible (grisée). */
  onClick?: () => void
}

/** Actions du panneau de gauche (nouveau, exporter, paramètres…). Dans un panneau, elles peuvent être masquées ou réordonnées. */
export function ActionList({ actions, section = 'actions' }: { actions: ActionItem[]; section?: string }) {
  const customization = useSidebarCustomization()
  const editing = customization?.editing ?? false
  const arranged = arrange(actions, (action) => action.label, customization?.prefs[section], editing)
  const ids = arranged.map((entry) => entry.id)

  return (
    <div className={styles.actions}>
      {arranged.map(({ item: action, id, hidden }, index) => (
        <div key={id} className={`${styles.row} ${hidden ? styles.hidden : ''}`}>
          <button
            type="button"
            className={styles.action}
            onClick={action.onClick}
            disabled={editing || !action.onClick}
            title={action.onClick ? undefined : 'Indisponible'}
          >
            <Icon name={action.icon} size={18} color={action.color} />
            <span>{action.label}</span>
          </button>
          {editing && customization && (
            <ItemControls
              hidden={hidden}
              canMoveUp={index > 0}
              canMoveDown={index < arranged.length - 1}
              onToggle={() => customization.toggleHidden(section, id)}
              onMove={(direction) => customization.move(section, ids, id, direction)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
