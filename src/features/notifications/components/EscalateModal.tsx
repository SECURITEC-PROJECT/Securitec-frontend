import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Modal } from '../../../components/ui'
import { escalateReport } from '../services/notifications'
import styles from './NotificationBell.module.css'

interface EscalateModalProps {
  reportId: string
  /** Texte du signalement rappelé dans la fenêtre. */
  quote: string
  /** Libellé du niveau supérieur (« Responsable sécurité »). */
  target: string
  onClose: () => void
  /** Appelé quand la fenêtre se ferme après une transmission réussie. */
  onDone: () => void
}

/** Transmission d'un signalement reçu au niveau supérieur, avec un complément facultatif. */
export function EscalateModal({ reportId, quote, target, onClose, onDone }: EscalateModalProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState<string[]>()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      setSentTo(await escalateReport(reportId, message.trim()))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Transmission impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Transmettre au ${target}`} open onClose={sentTo ? onDone : onClose}>
      {sentTo ? (
        <div className={styles.form}>
          <p className={styles.success}>Signalement transmis à : {sentTo.join(', ')}.</p>
          <Button type="button" onClick={onDone}>
            Fermer
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <p className={styles.quote}>{quote}</p>
          <label className={styles.field}>
            <span>Complément (facultatif)</span>
            <textarea rows={4} value={message} maxLength={2000} placeholder="Ex. : une intervention est nécessaire rapidement." onChange={(event) => setMessage(event.target.value)} />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Envoi…' : `Transmettre au ${target}`}
          </Button>
        </form>
      )}
    </Modal>
  )
}
