import { useEffect, useState } from 'react'
import { fetchSites } from '../../sites/services/sites'
import type { DirectoryLookups } from '../types'

const EMPTY: DirectoryLookups = { sites: [] }

/** Sites accessibles, pour les listes déroulantes des formulaires. */
export function useLookups(enabled: boolean): DirectoryLookups {
  const [lookups, setLookups] = useState(EMPTY)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchSites()
      .catch(() => [])
      .then((sites) => !cancelled && setLookups({ sites: sites.map((site) => ({ value: site.id, label: site.name })) }))
    return () => {
      cancelled = true
    }
  }, [enabled])

  return lookups
}
