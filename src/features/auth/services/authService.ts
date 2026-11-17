import { api } from '../../../lib/api'
import type { LoginCredentials, SessionUser } from '../types'

export async function login(credentials: LoginCredentials) {
  return api<{ token: string; user: SessionUser }>('/auth/login', { method: 'POST', body: credentials, skipAuthRedirect: true })
}

export async function fetchSession() {
  const { user } = await api<{ user: SessionUser }>('/auth/me')
  return user
}
