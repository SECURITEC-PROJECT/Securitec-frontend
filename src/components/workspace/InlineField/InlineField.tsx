import type { RegisterField } from '../types'
import styles from './InlineField.module.css'

interface InlineFieldProps {
  field: RegisterField
  value: string | boolean
  options: { value: string; label: string }[]
  onChange: (value: string | boolean) => void
  onEnter: () => void
  /** Pour l'édition d'une cellule : focus automatique, perte de focus et touche Échap. */
  autoFocus?: boolean
  onBlur?: () => void
  onEscape?: () => void
}

/** Contrôle compact, sans étiquette, pour la ligne de saisie d'un tableau (le libellé sert de placeholder). */
export function InlineField({ field, value, options, onChange, onEnter, autoFocus, onBlur, onEscape }: InlineFieldProps) {
  const { label, type, required } = field
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') onEnter()
    else if (event.key === 'Escape') onEscape?.()
  }

  if (type === 'select') {
    return (
      <select
        className={styles.control}
        value={String(value)}
        aria-label={label}
        autoFocus={autoFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  if (type === 'checkbox') {
    return (
      <label className={styles.check}>
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        {label}
      </label>
    )
  }

  return (
    <input
      className={styles.control}
      // Un champ « textarea » du formulaire devient une saisie sur une ligne dans le tableau.
      type={type === 'textarea' ? 'text' : type}
      value={String(value)}
      placeholder={label}
      aria-label={label}
      aria-required={required}
      autoFocus={autoFocus}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}
