import { useEffect } from 'react'
import type { ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Fenêtre large (aperçu d'un fichier). */
  wide?: boolean
  /** Largeur maximale en pixels (par défaut 440). */
  width?: number
}

export function Modal({ title, open, onClose, children, wide, width }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={`${styles.modal} ${wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
