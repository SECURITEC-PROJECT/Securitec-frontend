import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CardChrome } from './SettingsCard'
import styles from './SettingsBoard.module.css'
import type { useCardLayout } from './useCardLayout'
import { ViewMenu } from './ViewMenu'

interface SettingsBoardProps {
  title: string
  subtitle?: string
  /** Boutons placés à gauche du menu « Vue » (ex. permissions, retour). */
  toolbar?: ReactNode
  layout: ReturnType<typeof useCardLayout>
  /** Contenu d'une carte ; `chrome` est à transmettre tel quel à la carte. */
  renderCard: (id: string, chrome: CardChrome) => ReactNode
  children?: ReactNode
}

/** Page de cartes en colonnes (paramètres du site, d'un utilisateur) : une carte ne change de place que si l'utilisateur la déplace. */
export function SettingsBoard({ title, subtitle, toolbar, layout, renderCard, children }: SettingsBoardProps) {
  const [dragged, setDragged] = useState<string>()
  const all = layout.columns.flat()

  const chromeFor = (id: string): CardChrome => ({
    open: !layout.collapsed.has(id),
    onToggle: () => layout.toggle(id),
    dragging: dragged === id,
    onDragStart: setDragged,
    onDrop: (targetId) => {
      if (dragged) layout.move(dragged, targetId)
      setDragged(undefined)
    },
    onDragEnd: () => setDragged(undefined),
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.tools}>
          {toolbar}
          <ViewMenu
            customized={layout.customized}
            onExpandAll={() => layout.setAllCollapsed(false)}
            onCollapseAll={() => layout.setAllCollapsed(true)}
            onReset={layout.reset}
          />
        </div>
      </header>

      <div className={styles.columns}>
        {layout.columns.map((column, index) => (
          <div
            key={index}
            className={styles.column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (dragged) layout.moveToColumn(dragged, index)
              setDragged(undefined)
            }}
          >
            {column.map((id) => (
              <div key={id}>{renderCard(id, chromeFor(id))}</div>
            ))}
          </div>
        ))}
      </div>
      {all.length === 0 && <p className={styles.empty}>Aucune section disponible avec vos droits.</p>}
      {children}
    </div>
  )
}
