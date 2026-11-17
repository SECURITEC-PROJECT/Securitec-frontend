import type { ReactNode } from 'react'
import styles from './WorkspaceLayout.module.css'

interface WorkspaceLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  /** Volet de détail à droite (facultatif). */
  aside?: ReactNode
}

/** Gabarit des pages de travail : panneau à gauche, contenu au centre, volet de détail à droite. */
export function WorkspaceLayout({ sidebar, children, aside }: WorkspaceLayoutProps) {
  return (
    <div className={styles.layout}>
      {sidebar}
      <main className={styles.main}>{children}</main>
      {aside}
    </div>
  )
}
