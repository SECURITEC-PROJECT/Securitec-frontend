import { useCallback, useEffect, useState } from 'react'
import { createSite, fetchSites } from '../services/sites'
import type { NewSite, Site } from '../types'

export function useSites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSites()
      .then(setSites)
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setLoading(false))
  }, [])

  const addSite = useCallback(async (input: NewSite) => {
    const site = await createSite(input)
    setSites((current) => [...current, site])
    return site
  }, [])

  return { sites, loading, error, addSite }
}
