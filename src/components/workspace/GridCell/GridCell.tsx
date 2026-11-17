import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { RegisterField } from '../types'
import { InlineField } from '../InlineField'
import styles from './GridCell.module.css'

interface GridCellProps {
  field: RegisterField
  value: string | boolean
  /** Texte affiché hors édition (valeur formatée). */
  display: string
  options: { value: string; label: string }[]
  /** Faux : la cellule se lit seulement. */
  editable: boolean
  /** Enregistre la nouvelle valeur ; une erreur rejetée laisse la cellule en édition. */
  onCommit: (value: string | boolean) => Promise<void>
  /** Libellé affiché devant la valeur quand une colonne regroupe plusieurs champs. */
  showLabel?: boolean
  /** Colore la valeur affichée (ex. un permis expiré en rouge). */
  tone?: 'danger' | 'success'
  /** Mode tableur : la cellule est toujours un champ de saisie (pas besoin de cliquer avant d'écrire). */
  alwaysEditing?: boolean
}

/** Déplacement au clavier façon tableur : les flèches passent à la cellule voisine. */
function moveFocus(cell: HTMLElement, key: string) {
  const td = cell.closest('td')
  const row = td?.parentElement
  if (!td || !row) return
  const column = Array.from(row.children).indexOf(td)
  const target =
    key === 'ArrowLeft' ? td.previousElementSibling : key === 'ArrowRight' ? td.nextElementSibling : (key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling)?.children[column]
  target?.querySelector<HTMLElement>('[data-grid-cell], input:not([type=hidden]), select')?.focus()
}

/** Cellule modifiable d'un tableau : un clic (ou Entrée / F2) l'édite, Entrée ou la sortie du champ enregistre, Échap annule. */
export function GridCell({ field, value, display, options, editable, onCommit, showLabel, tone, alwaysEditing }: GridCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string | boolean>(value)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const commit = async (next: string | boolean) => {
    if (saving) return
    if (next === value) {
      setEditing(false)
      setError('')
      return
    }
    setSaving(true)
    try {
      await onCommit(next)
      setEditing(false)
      setError('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
    setError('')
  }

  const label = showLabel ? <span className={styles.label}>{field.label}</span> : null

  if (!editable) {
    return (
      <div className={styles.static}>
        {label}
        {display || '—'}
      </div>
    )
  }

  if (alwaysEditing && field.type !== 'checkbox') return <SpreadsheetCell field={field} value={value} options={options} onCommit={onCommit} />

  // Une case à cocher s'enregistre dès qu'on la bascule.
  if (field.type === 'checkbox') {
    return (
      <div className={styles.static}>
        <input type="checkbox" checked={Boolean(value)} disabled={saving} onChange={(event) => void commit(event.target.checked)} aria-label={field.label} />
        {label}
      </div>
    )
  }

  if (editing) {
    return (
      <div className={styles.editing} title={error || undefined}>
        {label}
        <InlineField
          field={field}
          value={draft}
          options={options}
          autoFocus
          onChange={(next) => {
            setDraft(next)
            // Une liste déroulante s'enregistre dès le choix.
            if (field.type === 'select') void commit(next)
          }}
          onEnter={() => void commit(draft)}
          onBlur={() => void commit(draft)}
          onEscape={cancel}
        />
        {error && <span className={styles.error}>{error}</span>}
      </div>
    )
  }

  const startEditing = () => {
    setDraft(value)
    setEditing(true)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      startEditing()
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault()
      moveFocus(event.currentTarget, event.key)
    }
  }

  return (
    <div className={`${styles.cell} ${tone ? styles[tone] : ''}`} data-grid-cell tabIndex={0} role="gridcell" onClick={startEditing} onKeyDown={onKeyDown} title="Cliquer pour modifier">
      {label}
      {display || <span className={styles.empty}>—</span>}
    </div>
  )
}

interface SpreadsheetCellProps {
  field: RegisterField
  value: string | boolean
  options: { value: string; label: string }[]
  onCommit: (value: string | boolean) => Promise<void>
}

/**
 * Cellule de tableur : le champ est toujours affiché, on écrit directement.
 * Entrée enregistre et passe à la ligne du dessous, Tab passe à la cellule suivante, ↑ ↓ changent de ligne, Échap annule.
 * La valeur est enregistrée quand on quitte la cellule.
 */
function SpreadsheetCell({ field, value, options, onCommit }: SpreadsheetCellProps) {
  const container = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<string | boolean>(value)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const commit = async (next: string | boolean) => {
    if (saving) return
    if (String(next) === String(value)) {
      setError('')
      return
    }
    setSaving(true)
    try {
      await onCommit(next)
      setError('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Dans une liste déroulante, les flèches choisissent une valeur : on ne les détourne pas.
    if (field.type === 'select' || !container.current) return
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(container.current, event.key)
    }
  }

  return (
    <div ref={container} className={`${styles.sheet} ${error ? styles.invalid : ''}`} title={error || undefined} onKeyDown={onKeyDown}>
      <InlineField
        field={field}
        value={draft}
        options={options}
        onChange={(next) => {
          setDraft(next)
          // Une liste déroulante s'enregistre dès le choix.
          if (field.type === 'select') void commit(next)
        }}
        onEnter={() => {
          void commit(draft)
          if (container.current) moveFocus(container.current, 'ArrowDown')
        }}
        onBlur={() => void commit(draft)}
        onEscape={() => {
          setDraft(value)
          setError('')
        }}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
