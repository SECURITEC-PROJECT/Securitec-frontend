import { useEffect, useRef, useState } from 'react'
import { FilePreview, Icon } from '../../../../components/ui'
import { deleteUserDocument, downloadUserDocument, fetchUserDocumentBlob, fetchUserDocuments, uploadUserDocument } from '../../../../services/userProfile'
import type { UserDocument } from '../../../../services/userProfile'
import { SettingsCard } from '../../../projectSettings/SettingsCard'
import type { CardChrome } from '../../../projectSettings/SettingsCard'
import styles from './UserDocumentsCard.module.css'

interface UserDocumentsCardProps extends CardChrome {
  userId: string
  editable: boolean
}

const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`)

/** Documents rattachés à un utilisateur (contrat, pièce d'identité, diplôme…) : envoi, téléchargement et suppression. */
export function UserDocumentsCard({ userId, editable, ...drag }: UserDocumentsCardProps) {
  const input = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<UserDocument[]>()
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ name: string; load: () => Promise<Blob | null>; download: () => void }>()

  useEffect(() => {
    let cancelled = false
    fetchUserDocuments(userId)
      .then((loaded) => !cancelled && setDocuments(loaded))
      .catch((failure: Error) => {
        if (cancelled) return
        setDocuments([])
        setError(failure.message)
      })
    return () => {
      cancelled = true
    }
  }, [userId, version])

  const run = async (action: () => Promise<unknown>, reload = true) => {
    setBusy(true)
    setError('')
    try {
      await action()
      if (reload) setVersion((value) => value + 1)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
    } finally {
      setBusy(false)
    }
  }

  const choose = (file: File | undefined) => {
    if (input.current) input.current.value = ''
    if (file) void run(() => uploadUserDocument(userId, file))
  }

  return (
    <SettingsCard id="documents" title="Documents" icon="document" color="#2e9e6a" onAdd={editable ? () => input.current?.click() : undefined} {...drag}>
      <input ref={input} type="file" hidden onChange={(event) => choose(event.target.files?.[0])} />
      {error && <p className={styles.error}>{error}</p>}
      {documents === undefined ? (
        <p className={styles.muted}>Chargement...</p>
      ) : documents.length === 0 ? (
        <p className={styles.muted}>{editable ? 'Aucun document. Utilisez « + » pour en ajouter (15 Mo maximum).' : 'Aucun document.'}</p>
      ) : (
        <ul className={styles.list}>
          {documents.map((document) => (
            <li key={document.id} className={styles.item}>
              <button type="button" className={styles.name} onClick={() => void run(() => downloadUserDocument(userId, document), false)} disabled={busy} title="Télécharger">
                {document.name}
              </button>
              <button
                type="button"
                className={styles.view}
                onClick={() => setPreview({ name: document.name, load: () => fetchUserDocumentBlob(userId, document), download: () => void run(() => downloadUserDocument(userId, document), false) })}
                title="Voir le document"
              >
                Voir
              </button>
              <small>{formatSize(document.size)}</small>
              {editable && (
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => window.confirm(`Supprimer « ${document.name} » ?`) && void run(() => deleteUserDocument(userId, document.id))}
                  disabled={busy}
                  aria-label={`Supprimer ${document.name}`}
                >
                  <Icon name="trash" size={15} color="var(--color-danger)" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {preview && <FilePreview open name={preview.name} load={preview.load} onDownload={preview.download} onClose={() => setPreview(undefined)} />}
    </SettingsCard>
  )
}
