import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Modal } from '../../../components/ui'
import { createReport } from '../../notifications/services/notifications'
import type { ReportTarget } from '../../notifications/types'
import styles from './ReportModal.module.css'

interface ReportModalProps {
  sheet: { id: string; name: string; postName: string }
  /** Ligne concernée par le signalement (identifiant et résumé lisible). */
  row?: { id: string; summary: string }
  /** Niveaux possibles : un seul pour un agent ou un chef de poste, plusieurs pour un administrateur. */
  targets: ReportTarget[]
  onClose: () => void
}

/** Signalement d'un problème au supérieur hiérarchique, depuis une feuille de saisie. Le destinataire est notifié. */
export function ReportModal({ sheet, row, targets, onClose }: ReportModalProps) {
  const [toProfile, setToProfile] = useState(targets[0]?.profile)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState<string[]>()

  const target = targets.find((candidate) => candidate.profile === toProfile) ?? targets[0]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      setSentTo(await createReport({ sheetId: sheet.id, rowId: row?.id, message: message.trim(), toProfile }))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Envoi impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Signaler au ${target?.label.toLowerCase() ?? 'supérieur'}`} open onClose={onClose}>
      {sentTo ? (
        <div className={styles.form}>
          <p className={styles.success}>Signalement envoyé à : {sentTo.join(', ')}. Ils sont notifiés.</p>
          <Button type="button" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <p className={styles.context}>
            Poste « {sheet.postName} » — feuille « {sheet.name} »
            {row && <span className={styles.row}>{row.summary || 'Ligne sélectionnée'}</span>}
          </p>
          {targets.length > 1 && (
            <label className={styles.field}>
              <span>Signaler à</span>
              <select value={toProfile} onChange={(event) => setToProfile(Number(event.target.value))}>
                {targets.map((option) => (
                  <option key={option.profile} value={option.profile}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={styles.field}>
            <span>Décrivez le problème</span>
            <textarea rows={5} required autoFocus maxLength={2000} value={message} placeholder="Ex. : la serrure de la porte nord est cassée, accès non sécurisé." onChange={(event) => setMessage(event.target.value)} />
          </label>
          <p className={styles.hint}>Le {target?.label.toLowerCase()} du poste recevra une notification. S'il le juge nécessaire, il pourra la transmettre à son propre supérieur.</p>
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" disabled={submitting || !message.trim()}>
            {submitting ? 'Envoi…' : 'Envoyer le signalement'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
