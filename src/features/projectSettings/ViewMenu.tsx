import { useState } from 'react'
import { Icon } from '../../components/ui'
import styles from './ViewMenu.module.css'

interface ViewMenuProps {
  customized: boolean
  onExpandAll: () => void
  onCollapseAll: () => void
  onReset: () => void
}

/** Menu « Vue » en haut à droite de la page : tout déplier, tout replier, revenir à la disposition par défaut. */
export function ViewMenu({ customized, onExpandAll, onCollapseAll, onReset }: ViewMenuProps) {
  const [open, setOpen] = useState(false)
  const run = (action: () => void) => () => {
    action()
    setOpen(false)
  }

  return (
    <div className={styles.menu}>
      <button type="button" className={styles.button} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Icon name="columns" size={18} color="var(--color-primary)" />
        {customized ? 'Vue personnalisée' : 'Vue par défaut'}
        <Icon name="down" size={16} color="var(--color-muted)" />
      </button>
      {open && (
        <div className={styles.popup} role="menu">
          <button type="button" role="menuitem" onClick={run(onExpandAll)}>
            Tout déplier
          </button>
          <button type="button" role="menuitem" onClick={run(onCollapseAll)}>
            Tout replier
          </button>
          <button type="button" role="menuitem" onClick={run(onReset)} disabled={!customized}>
            Revenir à la vue par défaut
          </button>
        </div>
      )}
    </div>
  )
}
