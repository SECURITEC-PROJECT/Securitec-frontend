import { useEffect, useState } from 'react'
import { fetchSiteUsers } from '../services/users'
import type { SiteUser } from '../types'

export function useSiteUsers(siteId: string) {
  const [users, setUsers] = useState<SiteUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchSiteUsers(siteId)
      .then((list) => !cancelled && setUsers(list))
      .catch((failure: Error) => !cancelled && setError(failure.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [siteId])

  return { users, loading, error }
}
