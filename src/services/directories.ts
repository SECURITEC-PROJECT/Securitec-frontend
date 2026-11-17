import { api } from '../lib/api'

// -------------------------------------------------------- Postes de garde

export interface ApiPost {
  id: string
  siteId: string
  nom: string
  actif: boolean
  siteName: string
  /** Utilisateurs affectés au poste, avec leurs prochaines vacations sur ce poste (7 jours). */
  users: { id: string; name: string; shifts: { id: string; startsAt: string; endsAt: string }[] }[]
  /** Personnes planifiées sur le poste aujourd'hui, le jour (6 h – 18 h) et la nuit (18 h – 6 h). */
  dayCount: number
  nightCount: number
}

/** Fenêtres « jour » (6 h – 18 h) et « nuit » (18 h – 6 h le lendemain) d'aujourd'hui, en heure locale. */
function todayWindows() {
  const now = new Date()
  const at = (dayOffset: number, hour: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour).toISOString()
  return new URLSearchParams({ dayFrom: at(0, 6), dayTo: at(0, 18), nightFrom: at(0, 18), nightTo: at(1, 6) })
}

export async function fetchPosts() {
  const { posts } = await api<{ posts: ApiPost[] }>(`/admin/posts?${todayWindows()}`)
  return posts
}

export const createPost = (siteId: string, nom: string) => api('/admin/posts', { method: 'POST', body: { siteId, nom } })

/** `userIds` absent : les affectations ne changent pas ; une liste (même vide) les remplace. */
export const updatePost = (id: string, nom: string, actif: boolean, userIds?: string[]) =>
  api(`/admin/posts/${id}`, { method: 'PUT', body: { nom, actif, ...(userIds !== undefined && { userIds }) } })

export interface AssignableUser {
  id: string
  name: string
  identifier: string
}

/** Comptes actifs d'un site, proposés pour l'affectation à un poste. */
export async function fetchAssignableUsers(siteId: string) {
  const { users } = await api<{ users: AssignableUser[] }>(`/admin/posts/assignable-users?siteId=${encodeURIComponent(siteId)}`)
  return users
}
