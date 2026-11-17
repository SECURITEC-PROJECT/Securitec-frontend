import { arrange, useSidebarCustomization } from '../WorkspaceSidebar/customization'
import { ItemControls } from '../WorkspaceSidebar/ItemControls'
import styles from './FilterList.module.css'

export interface FilterItem<K extends string> {
  key: K
  label: string
  /** Nombre affiché à droite ; absent = aucun compteur. */
  count?: number
  /** Pastille de couleur devant le libellé (facultatif). */
  color?: string
}

interface FilterListProps<K extends string> {
  items: FilterItem<K>[]
  value: K
  onChange: (key: K) => void
  /** Identifiant de la liste dans les réglages du menu (utile s'il y en a plusieurs). */
  section?: string
}

/** Liste de filtres avec compteurs ; l'élément actif est en violet plein. Dans un panneau, elle peut être personnalisée. */
export function FilterList<K extends string>({ items, value, onChange, section = 'filters' }: FilterListProps<K>) {
  const customization = useSidebarCustomization()
  const editing = customization?.editing ?? false
  const arranged = arrange(items, (item) => item.key, customization?.prefs[section], editing, value)
  const ids = arranged.map((entry) => entry.id)

  return (
    <ul className={styles.list}>
      {arranged.map(({ item, id, hidden }, index) => (
        <li key={id} className={`${styles.row} ${hidden ? styles.hidden : ''}`}>
          <button
            type="button"
            className={`${styles.item} ${item.key === value ? styles.active : ''}`}
            onClick={() => onChange(item.key)}
            disabled={editing}
          >
            {item.color && <span className={styles.dot} style={{ background: item.color }} />}
            <span className={styles.label}>{item.label}</span>
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
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
        </li>
      ))}
    </ul>
  )
}
