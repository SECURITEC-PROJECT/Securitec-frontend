import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import styles from './SlidePanel.module.css'

interface SlidePanelProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Largeur du panneau en pixels (640 par défaut). */
  width?: number
}

/** Panneau latéral (comme les « slides » de HEROES) : en-tête, contenu défilant, pied d'actions. */
export function SlidePanel({ title, open, onClose, children, footer, width }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined} onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </aside>
    </div>
  )
}
