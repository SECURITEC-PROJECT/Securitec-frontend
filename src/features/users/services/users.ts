import { api } from '../../../lib/api'
import type { SiteUser } from '../types'

export async function fetchSiteUsers(siteId: string) {
  const { users } = await api<{ users: SiteUser[] }>(`/sites/${encodeURIComponent(siteId)}/users`)
  return users
}
