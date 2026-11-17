import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Modal, TextField } from '../../../components/ui'
import { createSheet } from '../services/sheets'
import type { Sheet } from '../types'
import styles from './AddSheetModal.module.css'

interface AddSheetModalProps {
  open: boolean
  post: { id: string; name: string }
  onClose: () => void
  onCreated: (sheet: Sheet) => void
}

/** Création d'une feuille de saisie pour un poste de garde ; ses colonnes se définissent ensuite dans le constructeur. */
export function AddSheetModal({ open, post, onClose, onCreated }: AddSheetModalProps) {
  return (
    <Modal title="Nouvelle feuille de saisie" open={open} onClose={onClose}>
      <AddSheetForm key={String(open)} post={post} onCreated={onCreated} />
    </Modal>
  )
}

function AddSheetForm({ post, onCreated }: Pick<AddSheetModalProps, 'post' | 'onCreated'>) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      onCreated(await createSheet(post.id, name.trim()))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Création impossible.')
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextField label="Nom de la feuille" required autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      <p className={styles.hint}>Ex. : « Main courante », « Visiteurs », « Clés ». Vous définirez ensuite les colonnes de la feuille pour le poste « {post.name} ».</p>
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting ? 'Création...' : 'Créer la feuille'}
      </Button>
    </form>
  )
}
