import { useEffect, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { Icon } from '../../components/ui'
import type { IconName } from '../../components/ui'
import styles from './SettingsCard.module.css'

export interface CardItem {
  id: string
  label: string
  sub?: string
  onClick?: () => void
}

/** Ce que la page fournit à chaque carte : état déplié / replié et glisser-déposer. */
export interface CardChrome {
  open: boolean
  onToggle: () => void
  dragging: boolean
  onDragStart: (id: string) => void
  onDrop: (targetId: string) => void
  onDragEnd: () => void
}

interface SettingsCardProps extends CardChrome {
  id: string
  title: string
  icon: IconName
  color: string
  /** Bouton « + » ; absent si l'utilisateur ne peut pas créer. */
  onAdd?: () => void
  /** Liste affichée dans la carte, chargée à l'affichage et à « Actualiser ». Absent = contenu fixe via `children`. */
  load?: () => Promise<CardItem[]>
  /** Lien « Tout gérer » sous la liste. */
  onManage?: () => void
  children?: ReactNode
}

const PREVIEW = 7

/** Carte de paramétrage : en-tête teinté (icône, titre, « + », repli, poignée), contenu déplié par défaut. */
export function SettingsCard({ id, title, icon, color, onAdd, load, onManage, children, open, onToggle, dragging, onDragStart, onDrop, onDragEnd }: SettingsCardProps) {
  const [state, setState] = useState<{ items: CardItem[]; error: string } | 'loading' | undefined>(load ? 'loading' : undefined)

  const refresh = () => {
    if (!load) return
    setState('loading')
    load()
      .then((items) => setState({ items, error: '' }))
      .catch((failure: Error) => setState({ items: [], error: failure.message }))
  }

  useEffect(() => {
    if (!load) return
    let cancelled = false
    load()
      .then((items) => !cancelled && setState({ items, error: '' }))
      .catch((failure: Error) => !cancelled && setState({ items: [], error: failure.message }))
    return () => {
      cancelled = true
    }
    // Chargement initial seulement : « Actualiser » recharge à la demande.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allowDrop = (event: DragEvent) => event.preventDefault()

  return (
    <section
      className={`${styles.card} ${dragging ? styles.dragging : ''}`}
      style={{ '--card-color': color } as React.CSSProperties}
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDrop(id)
      }}
    >
      <header className={styles.header}>
        <Icon name={icon} size={20} color={color} />
        <h2 className={styles.title}>{title}</h2>
        {onAdd && (
          <button type="button" className={styles.tool} onClick={onAdd} title="Ajouter" aria-label={`Ajouter — ${title}`}>
            <Icon name="add" size={18} color="var(--color-muted)" />
          </button>
        )}
        <button type="button" className={styles.tool} onClick={onToggle} aria-expanded={open} title={open ? 'Replier' : 'Déplier'} aria-label={`${open ? 'Replier' : 'Déplier'} — ${title}`}>
          <Icon name={open ? 'up' : 'down'} size={18} color="var(--color-muted)" />
        </button>
        <span
          className={styles.handle}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            onDragStart(id)
          }}
          onDragEnd={onDragEnd}
          title="Déplacer cette carte"
          aria-label={`Déplacer — ${title}`}
        >
          <Icon name="list" size={18} color="var(--color-muted)" />
        </span>
      </header>

      {open && children && <div className={styles.body}>{children}</div>}

      {open && load && (
        <div className={styles.body}>
          {state === 'loading' || !state ? (
            <p className={styles.muted}>Chargement...</p>
          ) : state.error ? (
            <p className={styles.error}>{state.error}</p>
          ) : state.items.length === 0 ? (
            <p className={styles.muted}>Aucun élément.</p>
          ) : (
            <ul className={styles.list}>
              {state.items.slice(0, PREVIEW).map((item) => (
                <li key={item.id}>
                  <button type="button" className={styles.item} onClick={item.onClick} disabled={!item.onClick}>
                    <span className={styles.itemLabel}>{item.label}</span>
                    {item.sub && <small>{item.sub}</small>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {state && state !== 'loading' && state.items.length > PREVIEW && <p className={styles.muted}>+ {state.items.length - PREVIEW} autre(s)</p>}
          <div className={styles.footer}>
            {onManage && (
              <button type="button" className={styles.manage} onClick={onManage}>
                Tout gérer
              </button>
            )}
            <button type="button" className={styles.manage} onClick={refresh}>
              ⟳ Actualiser
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
