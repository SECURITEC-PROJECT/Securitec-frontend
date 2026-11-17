import { useEffect, useRef, useState } from 'react'
import { CameraCapture, FilePreview, Icon, SlidePanel } from '../../../components/ui'
import { deleteRowFile, downloadRowFile, fetchRowFileBlob, fetchRowFiles, uploadRowFile } from '../services/sheets'
import type { SheetFile } from '../types'
import styles from './AttachmentsCell.module.css'

interface AttachmentsCellProps {
  sheetId: string
  rowId: string
  columnId: string
  columnLabel: string
  /** Nombre de fichiers déjà joints (connu au chargement du tableau). */
  count: number
  /** Joindre et retirer des fichiers modifie la ligne : réservé à qui peut la modifier. */
  editable: boolean
  /** Façons de joindre un fichier, réglées dans les paramètres de la colonne. */
  allowUpload: boolean
  allowPhoto: boolean
}

const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`)

/** Cellule d'une colonne « Action : attacher des fichiers » : le nombre de fichiers, et un panneau pour les joindre, les télécharger ou les retirer. */
export function AttachmentsCell({ sheetId, rowId, columnId, columnLabel, count: initialCount, editable, allowUpload, allowPhoto }: AttachmentsCellProps) {
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [camera, setCamera] = useState(false)
  const [preview, setPreview] = useState<{ name: string; load: () => Promise<Blob | null>; download: () => void }>()
  const [files, setFiles] = useState<SheetFile[]>()
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchRowFiles(sheetId, rowId, columnId)
      .then((loaded) => {
        if (cancelled) return
        setFiles(loaded)
        setCount(loaded.length)
      })
      .catch((failure: Error) => {
        if (cancelled) return
        setFiles([])
        setError(failure.message)
      })
    return () => {
      cancelled = true
    }
  }, [open, sheetId, rowId, columnId, version])

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

  const choose = (selected: FileList | File[] | null) => {
    const list = selected ? [...selected] : []
    if (input.current) input.current.value = ''
    if (list.length === 0) return
    void run(async () => {
      for (const file of list) await uploadRowFile(sheetId, rowId, columnId, file)
    })
  }

  const takePhoto = (photo: File) => choose([photo])

  const openPanel = () => {
    setFiles(undefined)
    setError('')
    setOpen(true)
  }

  return (
    <>
      <button type="button" className={`${styles.button} ${count > 0 ? styles.has : ''}`} onClick={openPanel} title={`Fichiers joints — ${columnLabel}`}>
        <Icon name="document" size={15} color={count > 0 ? '#2e9e6a' : 'var(--color-muted)'} />
        {count > 0 ? `${count} fichier${count > 1 ? 's' : ''}` : editable ? (allowUpload ? 'Joindre' : 'Photo') : '—'}
      </button>
      <SlidePanel title={`Fichiers — ${columnLabel}`} open={open} onClose={() => setOpen(false)} width={420}>
        <input ref={input} type="file" multiple hidden onChange={(event) => choose(event.target.files)} />
        {error && <p className={styles.error}>{error}</p>}
        {files === undefined ? (
          <p className={styles.muted}>Chargement...</p>
        ) : files.length === 0 ? (
          <p className={styles.muted}>{editable ? 'Aucun fichier joint à cette ligne.' : 'Aucun fichier.'}</p>
        ) : (
          <ul className={styles.list}>
            {files.map((file) => (
              <li key={file.id} className={styles.item}>
                <button type="button" className={styles.name} onClick={() => void run(() => downloadRowFile(sheetId, rowId, file), false)} disabled={busy} title="Télécharger">
                  {file.name}
                </button>
                <button
                  type="button"
                  className={styles.view}
                  onClick={() => setPreview({ name: file.name, load: () => fetchRowFileBlob(sheetId, rowId, file), download: () => void run(() => downloadRowFile(sheetId, rowId, file), false) })}
                  title="Voir le fichier"
                >
                  Voir
                </button>
                <small>{formatSize(file.size)}</small>
                {editable && (
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => window.confirm(`Retirer « ${file.name} » ?`) && void run(() => deleteRowFile(sheetId, rowId, file.id))}
                    disabled={busy}
                    aria-label={`Retirer ${file.name}`}
                  >
                    <Icon name="trash" size={15} color="var(--color-danger)" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <div className={styles.adders}>
            {allowUpload && (
              <button type="button" className={styles.upload} onClick={() => input.current?.click()} disabled={busy}>
                {busy ? 'Envoi...' : '+ Attacher des fichiers'}
              </button>
            )}
            {allowPhoto && (
              <button type="button" className={styles.upload} onClick={() => setCamera(true)} disabled={busy}>
                📷 Prendre une photo
              </button>
            )}
          </div>
        )}
        <p className={styles.hint}>{allowUpload ? 'Images, PDF, Word, Excel, CSV ou texte' : 'Photos'} — 15 Mo maximum par fichier.</p>
      </SlidePanel>
      {preview && <FilePreview open name={preview.name} load={preview.load} onDownload={preview.download} onClose={() => setPreview(undefined)} />}
      <CameraCapture open={camera} onClose={() => setCamera(false)} onCapture={takePhoto} />
    </>
  )
}
