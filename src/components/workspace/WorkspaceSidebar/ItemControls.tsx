import { Icon } from '../../ui'
import styles from './ItemControls.module.css'

interface ItemControlsProps {
  hidden: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onToggle: () => void
  onMove: (direction: -1 | 1) => void
}

/** Boutons d'un élément du panneau en mode « personnaliser » : afficher / masquer et déplacer. */
export function ItemControls({ hidden, canMoveUp, canMoveDown, onToggle, onMove }: ItemControlsProps) {
  return (
    <span className={styles.controls}>
      <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Monter">
        <Icon name="up" size={16} />
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Descendre">
        <Icon name="down" size={16} />
      </button>
      <button type="button" onClick={onToggle} aria-label={hidden ? 'Afficher' : 'Masquer'} title={hidden ? 'Afficher' : 'Masquer'}>
        <Icon name={hidden ? 'close' : 'eye'} size={16} color={hidden ? 'var(--color-danger)' : '#2e9e6a'} />
      </button>
    </span>
  )
}
