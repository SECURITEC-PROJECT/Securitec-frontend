import { useEffect, useState } from 'react'
import { fetchCatalog } from '../../../services/access'
import type { PermissionCatalog } from '../types'

export function useCatalog() {
  const [catalog, setCatalog] = useState<PermissionCatalog>()
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCatalog()
      .then(setCatalog)
      .catch((failure: Error) => setError(failure.message))
  }, [])

  return { catalog, error }
}
