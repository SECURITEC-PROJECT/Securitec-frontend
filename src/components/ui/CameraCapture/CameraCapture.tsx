import { useEffect, useRef, useState } from 'react'
import { Button } from '../Button'
import { Modal } from '../Modal'
import styles from './CameraCapture.module.css'

interface CameraCaptureProps {
  open: boolean
  onClose: () => void
  /** Reçoit la photo prise (fichier JPEG). */
  onCapture: (photo: File) => void
}

const MAX_SIDE = 1600

const photoName = () => `photo-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}.jpg`

/** Prise de photo avec la caméra de l'appareil (aperçu en direct, capture, reprise). Sur un appareil sans caméra accessible, on propose l'appareil photo du système. */
export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  return (
    <Modal title="Prendre une photo" open={open} onClose={onClose}>
      <Camera key={String(open)} onClose={onClose} onCapture={onCapture} />
    </Modal>
  )
}

function Camera({ onClose, onCapture }: Pick<CameraCaptureProps, 'onClose' | 'onCapture'>) {
  const video = useRef<HTMLVideoElement>(null)
  const fallback = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<{ file: File; url: string }>()

  // Ouvre la caméra arrière quand il y en a une ; libère l'appareil à la fermeture.
  useEffect(() => {
    let stream: MediaStream | undefined
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => !cancelled && setError('La caméra n’est pas disponible dans ce navigateur.'))
      return () => {
        cancelled = true
      }
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((opened) => {
        if (cancelled) return opened.getTracks().forEach((track) => track.stop())
        stream = opened
        if (video.current) {
          video.current.srcObject = opened
          void video.current.play().then(() => !cancelled && setReady(true))
        }
      })
      .catch(() => !cancelled && setError('Impossible d’accéder à la caméra. Autorisez-la dans le navigateur, ou utilisez l’appareil photo du système.'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  // Libère l'aperçu de la photo prise.
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo])

  const capture = () => {
    const element = video.current
    if (!element || !element.videoWidth) return
    const scale = Math.min(1, MAX_SIDE / Math.max(element.videoWidth, element.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(element.videoWidth * scale)
    canvas.height = Math.round(element.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(element, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError('La photo n’a pas pu être prise.')
        const file = new File([blob], photoName(), { type: 'image/jpeg' })
        setPhoto({ file, url: URL.createObjectURL(file) })
      },
      'image/jpeg',
      0.85,
    )
  }

  const use = (file: File) => {
    onCapture(file)
    onClose()
  }

  return (
    <div className={styles.camera}>
      {error && <p className={styles.error}>{error}</p>}
      {!error && (
        <div className={styles.stage}>
          {/* Le flux reste monté sous l'aperçu : « Reprendre » n'a pas besoin de rouvrir la caméra. */}
          <video ref={video} className={styles.video} playsInline muted />
          {photo && <img src={photo.url} alt="Photo prise" className={styles.preview} />}
          {!ready && <p className={styles.loading}>Ouverture de la caméra…</p>}
        </div>
      )}

      <div className={styles.actions}>
        {photo ? (
          <>
            <Button type="button" onClick={() => use(photo.file)}>
              Utiliser cette photo
            </Button>
            <Button type="button" variant="outline" onClick={() => setPhoto(undefined)}>
              Reprendre
            </Button>
          </>
        ) : (
          <Button type="button" onClick={capture} disabled={!ready || !!error}>
            Capturer
          </Button>
        )}
        <input ref={fallback} type="file" accept="image/*" capture="environment" hidden onChange={(event) => event.target.files?.[0] && use(event.target.files[0])} />
        <button type="button" className={styles.system} onClick={() => fallback.current?.click()}>
          Utiliser l’appareil photo du système
        </button>
      </div>
    </div>
  )
}
