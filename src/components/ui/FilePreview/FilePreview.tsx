import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { Modal } from '../Modal'
import styles from './FilePreview.module.css'

interface FilePreviewProps {
  open: boolean
  onClose: () => void
  /** Nom du fichier (son extension détermine l'aperçu). */
  name: string
  /** Lit le contenu du fichier ; `null` s'il n'existe plus. */
  load: () => Promise<Blob | null>
  /** Si fourni, un bouton « Télécharger » est proposé. */
  onDownload?: () => void
}

type Kind = 'image' | 'pdf' | 'text' | 'none'

const IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const TEXTS = ['txt', 'csv']
const MAX_TEXT_CHARS = 200_000

const kindOf = (name: string): Kind => {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (IMAGES.includes(extension)) return 'image'
  if (extension === 'pdf') return 'pdf'
  if (TEXTS.includes(extension)) return 'text'
  return 'none'
}

/** Aperçu d'un fichier sans le télécharger : image, PDF ou texte. Les autres formats (Word, Excel…) se téléchargent. */
export function FilePreview({ open, onClose, name, load, onDownload }: FilePreviewProps) {
  return (
    <Modal title={name} open={open} onClose={onClose} wide>
      <Preview key={String(open)} name={name} load={load} onDownload={onDownload} onClose={onClose} />
    </Modal>
  )
}

function Preview({ name, load, onDownload, onClose }: Omit<FilePreviewProps, 'open'>) {
  const kind = kindOf(name)
  const [content, setContent] = useState<{ url?: string; text?: string }>()
  const [error, setError] = useState('')

  useEffect(() => {
    if (kind === 'none') return
    let cancelled = false
    let url: string | undefined
    load()
      .then(async (blob) => {
        if (cancelled) return
        if (!blob) return setError('Ce fichier est introuvable.')
        if (kind === 'text') {
          const text = await blob.text()
          if (!cancelled) setContent({ text: text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n… (suite tronquée)` : text })
          return
        }
        // Le type est imposé : un PDF ou une image n'est jamais interprété comme autre chose.
        url = URL.createObjectURL(kind === 'pdf' ? new Blob([blob], { type: 'application/pdf' }) : blob)
        setContent({ url })
      })
      .catch((failure: Error) => !cancelled && setError(failure.message))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [kind, load])

  return (
    <div className={styles.preview}>
      {kind === 'none' ? (
        <p className={styles.message}>Aucun aperçu n’est disponible pour ce format. Téléchargez le fichier pour l’ouvrir.</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : !content ? (
        <p className={styles.message}>Chargement…</p>
      ) : kind === 'image' ? (
        <img className={styles.image} src={content.url} alt={name} />
      ) : kind === 'pdf' ? (
        <iframe className={styles.frame} src={content.url} title={name} />
      ) : (
        <pre className={styles.text}>{content.text}</pre>
      )}
      <div className={styles.actions}>
        {onDownload && (
          <Button type="button" variant="outline" onClick={onDownload}>
            Télécharger
          </Button>
        )}
        <Button type="button" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  )
}
