import { useEffect, useRef, useState } from 'react'
import { CameraCapture, Icon } from '../../../../components/ui'
import { prepareImage } from '../../../../lib/image'
import { fetchUserPhoto, removeUserPhoto, uploadUserPhoto } from '../../../../services/userProfile'
import { SettingsCard } from '../../../projectSettings/SettingsCard'
import type { CardChrome } from '../../../projectSettings/SettingsCard'
import styles from './UserPhotoCard.module.css'

interface UserPhotoCardProps extends CardChrome {
  userId: string
  editable: boolean
}

/** Limite du fichier d'origine (la photo est réduite avant l'envoi, elle ne pèsera pas autant). */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024

/** Photo d'identité d'un utilisateur : aperçu, choix d'une image, prise de photo avec la caméra, retrait. L'image est réduite automatiquement avant l'envoi. */
export function UserPhotoCard({ userId, editable, ...chrome }: UserPhotoCardProps) {
  const input = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<{ url: string | null }>()
  const [version, setVersion] = useState(0)
  const [camera, setCamera] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    fetchUserPhoto(userId)
      .then((blob) => {
        if (cancelled) return
        url = blob ? URL.createObjectURL(blob) : null
        setPhoto({ url })
      })
      .catch((failure: Error) => {
        if (cancelled) return
        setPhoto({ url: null })
        setError(failure.message)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [userId, version])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      setVersion((value) => value + 1)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
    } finally {
      setBusy(false)
    }
  }

  const send = (file: File | undefined) => {
    if (input.current) input.current.value = ''
    if (!file) return
    if (file.size > MAX_SOURCE_BYTES) return setError('Cette image est trop volumineuse (25 Mo maximum).')
    // Une photo de téléphone fait vite plus de 2 Mo : on la réduit (1024 px, JPEG) avant de l'envoyer.
    void run(async () => uploadUserPhoto(userId, await prepareImage(file)))
  }

  return (
    <SettingsCard id="photo" title="Photo d'identité" icon="camera" color="#7939b8" {...chrome}>
      <div className={styles.photo}>
        <div className={styles.frame}>
          {photo?.url ? <img src={photo.url} alt="Photo d'identité" className={styles.image} /> : <Icon name="account" size={64} color="var(--color-border)" />}
        </div>
        {editable ? (
          <div className={styles.actions}>
            <input ref={input} type="file" accept="image/*" hidden onChange={(event) => send(event.target.files?.[0])} />
            <button type="button" onClick={() => input.current?.click()} disabled={busy}>
              {photo?.url ? 'Changer la photo' : 'Choisir une photo'}
            </button>
            <button type="button" onClick={() => setCamera(true)} disabled={busy}>
              Prendre une photo
            </button>
            {photo?.url && (
              <button type="button" className={styles.remove} onClick={() => window.confirm('Retirer la photo d’identité ?') && void run(() => removeUserPhoto(userId))} disabled={busy}>
                Retirer
              </button>
            )}
          </div>
        ) : (
          !photo?.url && <small className={styles.hint}>Aucune photo.</small>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {editable && <p className={styles.hint}>Toute image : elle est réduite automatiquement avant l’envoi.</p>}
      <CameraCapture open={camera} onClose={() => setCamera(false)} onCapture={(file) => send(file)} />
    </SettingsCard>
  )
}
