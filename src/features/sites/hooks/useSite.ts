import { useEffect, useState } from 'react'
import { fetchSite } from '../services/sites'
import type { Site } from '../types'

export function useSite(id: string) {
  const [site, setSite] = useState<Site>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchSite(id)
      .then((found) => !cancelled && setSite(found))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  return { site, loading }
}
