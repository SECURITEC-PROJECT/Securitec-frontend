import { api, apiBlob, apiUpload } from '../lib/api'

const CHANGED = 'securitec:site-logo-changed'

/** Image du logo d'un site, ou null s'il n'en a pas (on affiche alors le logo SECURITEC). */
export const fetchSiteLogo = (siteId: string) => apiBlob(`/sites/${siteId}/logo`)

const notify = () => window.dispatchEvent(new Event(CHANGED))

export async function uploadSiteLogo(siteId: string, file: File) {
  await apiUpload(`/sites/${siteId}/logo`, file, {}, 'PUT')
  notify()
}

export async function removeSiteLogo(siteId: string) {
  await api(`/sites/${siteId}/logo`, { method: 'DELETE' })
  notify()
}

/** Appelle `listener` quand un logo vient d'être changé ou retiré ; renvoie la fonction d'arrêt. */
export function onSiteLogoChanged(listener: () => void) {
  window.addEventListener(CHANGED, listener)
  return () => window.removeEventListener(CHANGED, listener)
}
