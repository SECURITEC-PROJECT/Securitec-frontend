import type { ReactNode } from 'react'
import styles from './FloatingBar.module.css'

/** Barre flottante au bas de l'écran (total, pagination, exports, heure de mise à jour…). */
export function FloatingBar({ children }: { children: ReactNode }) {
  return <div className={styles.bar}>{children}</div>
}

/** Pastille violette du total (ex. « 11 postes »). */
export function CountPill({ children }: { children: ReactNode }) {
  return <span className={styles.pill}>{children}</span>
}

export function FloatingText({ children }: { children: ReactNode }) {
  return <span className={styles.text}>{children}</span>
}
