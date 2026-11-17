import { useEffect, useState } from 'react'
import { FilePreview, Icon } from '../../../components/ui'
import { downloadRowFile, fetchRowFileBlob, fetchRowFiles } from '../services/sheets'
import type { SheetFile } from '../types'
import styles from './RowFiles.module.css'

interface RowFilesProps {
  sheetId: string
  rowId: string
  columnId: string
  /** Nombre de fichiers connu au chargement du tableau : à 0, rien n'est demandé au serveur. */
  count: number
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const isImage = (file: SheetFile) => IMAGE_EXTENSIONS.includes(file.extension.toLowerCase())
const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`)

/** Fichiers joints à une ligne, affichés directement : miniatures pour les images (photos), liste pour les autres. Un clic ouvre l'aperçu. */
export function RowFiles({ sheetId, rowId, columnId, count }: RowFilesProps) {
  const [files, setFiles] = useState<SheetFile[]>()
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<SheetFile>()

  useEffect(() => {
    if (count === 0) return
    let cancelled = false
    fetchRowFiles(sheetId, rowId, columnId)
      .then((loaded) => !cancelled && setFiles(loaded))
      .catch((failure: Error) => {
        if (cancelled) return
        setFiles([])
        setError(failure.message)
      })
    return () => {
      cancelled = true
    }
  }, [sheetId, rowId, columnId, count])

  if (count === 0) return <span className={styles.muted}>Aucun fichier</span>
  if (!files) return <span className={styles.muted}>Chargement…</span>

  const images = files.filter(isImage)
  const others = files.filter((file) => !isImage(file))

  return (
    <div className={styles.files}>
      {error && <span className={styles.error}>{error}</span>}
      {images.length > 0 && (
        <div className={styles.thumbs}>
          {images.map((file) => (
            <Thumb key={file.id} sheetId={sheetId} rowId={rowId} file={file} onOpen={() => setPreview(file)} />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className={styles.list}>
          {others.map((file) => (
            <li key={file.id}>
              <Icon name="document" size={16} color="var(--color-muted)" />
              <span className={styles.name}>{file.name}</span>
              <small>{formatSize(file.size)}</small>
              <button type="button" onClick={() => setPreview(file)} title="Voir le fichier" aria-label={`Voir ${file.name}`}>
                <Icon name="eye" size={16} color="var(--color-info)" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <FilePreview
          open
          name={preview.name}
          load={() => fetchRowFileBlob(sheetId, rowId, preview)}
          onDownload={() => void downloadRowFile(sheetId, rowId, preview).catch(() => undefined)}
          onClose={() => setPreview(undefined)}
        />
      )}
    </div>
  )
}

/** Miniature d'une image jointe (chargée avec la session, puis affichée depuis la mémoire du navigateur). */
function Thumb({ sheetId, rowId, file, onOpen }: { sheetId: string; rowId: string; file: SheetFile; onOpen: () => void }) {
  const [url, setUrl] = useState<string | null>()

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    fetchRowFileBlob(sheetId, rowId, file)
      .then((blob) => {
        if (cancelled) return
        objectUrl = blob ? URL.createObjectURL(blob) : null
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [sheetId, rowId, file])

  return (
    <button type="button" className={styles.thumb} onClick={onOpen} title={`${file.name} — cliquer pour agrandir`} aria-label={`Agrandir ${file.name}`}>
      {url ? <img src={url} alt={file.name} /> : <span className={styles.placeholder}>{url === null ? '⚠' : '…'}</span>}
      <span className={styles.caption}>{file.name}</span>
    </button>
  )
}
