import { useCallback, useEffect, useState } from 'react'
import { createUser, deactivateUser, fetchUsers, updateUser } from '../../../services/access'
import type { AccessUser, UserInput } from '../types'

export function useUsers() {
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(() => fetchUsers().then(setUsers), [])

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setLoading(false))
  }, [])

  const create = useCallback(
    async (input: UserInput) => {
      await createUser(input)
      await reload()
    },
    [reload],
  )

  const update = useCallback(
    async (id: string, input: UserInput) => {
      await updateUser(id, input)
      await reload()
    },
    [reload],
  )

  const deactivate = useCallback(
    async (id: string) => {
      await deactivateUser(id)
      await reload()
    },
    [reload],
  )

  return { users, loading, error, create, update, deactivate }
}
