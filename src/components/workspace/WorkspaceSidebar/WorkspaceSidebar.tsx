import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../../features/auth'
import { Icon, Logo, SiteLogo } from '../../ui'
import type { SiteContext } from '../../layout/SiteLayout/useCurrentSite'
import { SidebarCustomizationContext } from './customization'
import type { SidebarCustomization, SidebarPrefs } from './customization'
import styles from './WorkspaceSidebar.module.css'

interface WorkspaceSidebarProps {
  title: string
  subtitle?: string
  children: ReactNode
}

const storageKey = (userId: string, scope: string) => `securitec.sidebar.${userId}.${scope}`

function loadPrefs(key: string): SidebarPrefs {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as SidebarPrefs
  } catch {
    return {}
  }
}

/** Panneau de gauche : logo, titre de la page, sous-titre, puis filtres et actions que l'utilisateur peut masquer ou réordonner. */
export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  // Une page = un jeu de réglages : /sites/:slug/<page> → « <page> ».
  const scope = useLocation().pathname.replace(/^\/sites\/[^/]+\//, '').replace(/^\//, '') || 'accueil'
  return <ConfigurableSidebar key={scope} scope={scope} {...props} />
}

function ConfigurableSidebar({ scope, title, subtitle, children }: WorkspaceSidebarProps & { scope: string }) {
  const { user } = useAuth()
  const siteId = useOutletContext<SiteContext | undefined>()?.site.id
  const key = storageKey(user?.id ?? 'anonyme', scope)
  const [prefs, setPrefs] = useState<SidebarPrefs>(() => loadPrefs(key))
  const [editing, setEditing] = useState(false)

  const save = (next: SidebarPrefs) => {
    setPrefs(next)
    if (Object.keys(next).length) localStorage.setItem(key, JSON.stringify(next))
    else localStorage.removeItem(key)
  }

  const customization = useMemo<SidebarCustomization>(
    () => ({
      editing,
      prefs,
      toggleHidden: (section, id) => {
        const current = prefs[section] ?? { hidden: [], order: [] }
        const hidden = current.hidden.includes(id) ? current.hidden.filter((item) => item !== id) : [...current.hidden, id]
        save({ ...prefs, [section]: { ...current, hidden } })
      },
      move: (section, ids, id, direction) => {
        const index = ids.indexOf(id)
        const target = index + direction
        if (index < 0 || target < 0 || target >= ids.length) return
        const order = [...ids]
        ;[order[index], order[target]] = [order[target], order[index]]
        save({ ...prefs, [section]: { hidden: prefs[section]?.hidden ?? [], order } })
      },
    }),
    // `save` ne dépend que de `key` et de `setPrefs`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing, prefs, key],
  )

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        {siteId ? <SiteLogo siteId={siteId} size={32} /> : <Logo size={32} />}
        <div className={styles.heading}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        <button
          type="button"
          className={`${styles.customize} ${editing ? styles.customizing : ''}`}
          onClick={() => setEditing((value) => !value)}
          title="Personnaliser ce menu"
          aria-label="Personnaliser ce menu"
          aria-pressed={editing}
        >
          <Icon name="settings" size={18} color="var(--color-muted)" />
        </button>
      </div>
      <SidebarCustomizationContext.Provider value={customization}>{children}</SidebarCustomizationContext.Provider>
      {editing && (
        <div className={styles.editBar}>
          <p>Masquez ou déplacez les éléments de ce menu. Vos choix sont propres à ce navigateur et à votre compte.</p>
          <div>
            <button type="button" onClick={() => save({})} disabled={Object.keys(prefs).length === 0}>
              Réinitialiser
            </button>
            <button type="button" className={styles.done} onClick={() => setEditing(false)}>
              Terminé
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
