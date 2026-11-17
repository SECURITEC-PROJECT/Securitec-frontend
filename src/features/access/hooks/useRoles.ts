import { useCallback, useEffect, useState } from 'react'
import { createRole, deleteRole, fetchRoles, updateRole } from '../../../services/access'
import type { RoleInput, RoleSummary } from '../types'

export function useRoles() {
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(() => fetchRoles().then(setRoles), [])

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setLoading(false))
  }, [])

  const create = useCallback(
    async (input: RoleInput) => {
      await createRole(input)
      await reload()
    },
    [reload],
  )

  const update = useCallback(
    async (id: string, input: RoleInput) => {
      await updateRole(id, input)
      await reload()
    },
    [reload],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteRole(id)
      await reload()
    },
    [reload],
  )

  return { roles, loading, error, create, update, remove, reload }
}
