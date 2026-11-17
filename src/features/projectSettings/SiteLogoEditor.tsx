import { useRef, useState } from 'react'
import { SiteLogo } from '../../components/ui'
import { removeSiteLogo, uploadSiteLogo } from '../../services/siteLogo'
import styles from './SiteLogoEditor.module.css'

const MAX_BYTES = 1024 * 1024

/** Aperçu du logo du site, avec choix d'une image (PNG, JPEG ou WebP de 1 Mo maximum) et retrait. */
export function SiteLogoEditor({ siteId, editable }: { siteId: string; editable: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
    } finally {
      setBusy(false)
    }
  }

  const choose = (file: File | undefined) => {
    if (input.current) input.current.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) return setError('Le logo dépasse la limite de 1 Mo.')
    void run(() => uploadSiteLogo(siteId, file))
  }

  return (
    <div className={styles.editor}>
      <SiteLogo siteId={siteId} size={72} />
      {editable ? (
        <div className={styles.actions}>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => choose(event.target.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Envoi...' : 'Changer le logo'}
          </button>
          <button type="button" onClick={() => void run(() => removeSiteLogo(siteId))} disabled={busy}>
            Retirer
          </button>
        </div>
      ) : (
        <small>Logo du site</small>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
