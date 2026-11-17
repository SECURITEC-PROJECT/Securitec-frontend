import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Modal, TextField } from '../../components/ui'
import { createPost } from '../../services/directories'
import styles from './AddPostModal.module.css'

interface AddPostModalProps {
  open: boolean
  /** Site ouvert : le poste lui est toujours rattaché. */
  site: { id: string; name: string }
  onClose: () => void
  onCreated: () => void
}

/** Création d'un poste de garde dans le site ouvert (depuis les paramètres du projet). */
export function AddPostModal({ open, site, onClose, onCreated }: AddPostModalProps) {
  return (
    <Modal title="Nouveau poste de garde" open={open} onClose={onClose}>
      <AddPostForm key={String(open)} site={site} onClose={onClose} onCreated={onCreated} />
    </Modal>
  )
}

function AddPostForm({ site, onClose, onCreated }: Omit<AddPostModalProps, 'open'>) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await createPost(site.id, name.trim())
      onCreated()
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Création impossible.')
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextField label="Nom du poste" required autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Site" value={site.name} readOnly disabled />
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" disabled={submitting || !name.trim()}>
        {submitting ? 'Ajout en cours...' : 'Ajouter'}
      </Button>
    </form>
  )
}
