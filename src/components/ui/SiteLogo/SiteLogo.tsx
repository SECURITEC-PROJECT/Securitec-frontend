import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchSiteLogo, onSiteLogoChanged } from '../../../services/siteLogo'
import { Logo } from '../Logo'

/** Logo du site s'il en a un, sinon le logo SECURITEC. */
export function SiteLogo({ siteId, size = 32, fill = false, fallback }: { siteId: string; size?: number; /** Le logo remplit tout son conteneur. */ fill?: boolean; /** Affiché si le site n'a pas de logo (par défaut : le logo SECURITEC). */ fallback?: ReactNode }) {
  const [state, setState] = useState<{ siteId: string; url: string | null }>()
  const [version, setVersion] = useState(0)

  useEffect(() => onSiteLogoChanged(() => setVersion((value) => value + 1)), [])

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    fetchSiteLogo(siteId)
      .then((blob) => {
        if (cancelled) return
        url = blob ? URL.createObjectURL(blob) : null
        setState({ siteId, url })
      })
      .catch(() => !cancelled && setState({ siteId, url: null }))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [siteId, version])

  if (state?.siteId === siteId && state.url) return <img
        src={state.url}
        alt="Logo du site"
        {...(fill ? { style: { width: '100%', height: '100%', objectFit: 'cover' } } : { width: size, height: size, style: { objectFit: 'contain', borderRadius: 6 } })}
      />
  return fallback ?? <Logo size={size} />
}
