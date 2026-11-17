import { useRef, useState } from 'react'
import { Button } from '../../../components/ui'
import { InlineField } from '../../../components/workspace'
import type { DirectoryConfig, DirectoryLookups, Values } from '../types'
import { fieldOptions, initialValues, toRegisterField } from '../utils'
import styles from './DirectoryDraftRow.module.css'

interface DirectoryDraftRowProps {
  config: DirectoryConfig
  siteId: string
  lookups: DirectoryLookups
  onSubmit: (values: Values) => Promise<void>
  onClose: () => void
  /** Mode tableur : la ligne est toujours là, s'enregistre quand on la quitte et reste prête pour la saisie suivante. */
  persistent?: boolean
}

/** Ligne de saisie en tête du tableau (« Ajouter une ligne ») : une cellule par colonne liée à un champ. */
export function DirectoryDraftRow({ config, siteId, lookups, onSubmit, onClose, persistent }: DirectoryDraftRowProps) {
  const row = useRef<HTMLTableRowElement>(null)
  const [values, setValues] = useState<Values>(() => initialValues(config.fields, siteId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const missing = config.fields.some((field) => field.required && !values[field.key].trim())
  const touched = config.fields.some((field) => field.type !== 'select' && values[field.key].trim() !== '' && values[field.key] !== initialValues(config.fields, siteId)[field.key])

  const submit = async () => {
    if (missing || saving) return
    setSaving(true)
    setError('')
    try {
      await onSubmit(values)
      // La ligne reste ouverte pour enchaîner les saisies.
      setValues(initialValues(config.fields, siteId))
      if (persistent) row.current?.querySelector<HTMLElement>('input, select')?.focus()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr
      ref={row}
      className={`${styles.draft} ${persistent ? styles.persistent : ''}`}
      // Tableur : quitter la ligne avec une saisie complète l'enregistre (comme valider une ligne dans Excel).
      onBlur={(event) => {
        if (persistent && !event.currentTarget.contains(event.relatedTarget as Node | null) && touched && !missing) void submit()
      }}
    >
      <td>
        {persistent ? (
          <span className={styles.new} title="Écrivez directement : Entrée ou la sortie de la ligne l'enregistre">
            ＋ Nouvelle
          </span>
        ) : (
          <button type="button" className={styles.close} onClick={onClose}>
            Fermer
          </button>
        )}
      </td>
      {config.columns.map((column) => {
        const field = config.fields.find((candidate) => candidate.key === (column.field ?? column.key))
        return (
          <td key={column.key}>
            {field && (
              <InlineField
                field={toRegisterField(field)}
                value={values[field.key]}
                options={fieldOptions(field, lookups)}
                onChange={(value) => setValues((current) => ({ ...current, [field.key]: String(value) }))}
                onEnter={() => void submit()}
              />
            )}
          </td>
        )
      })}
      {config.setActive && <td />}
      <td className={styles.submit}>
        <Button type="button" disabled={missing || saving} onClick={() => void submit()} title={error || (missing ? 'Renseignez les champs obligatoires' : undefined)}>
          Ajouter
        </Button>
        {error && <span className={styles.error}>{error}</span>}
      </td>
    </tr>
  )
}
