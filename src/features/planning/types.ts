export interface Shift {
  id: string
  userId: string
  userName: string
  matricule: string
  siteId: string
  siteName: string
  postId: string | null
  postName: string | null
  startsAt: string
  endsAt: string
  note: string
}

export interface ShiftInput {
  userId: string
  siteId: string
  postId: string | null
  startsAt: string
  endsAt: string
  note: string
}

export interface PlanningOptions {
  users: { id: string; name: string; matricule: string; siteId: string | null }[]
  sites: { id: string; name: string }[]
  posts: { id: string; name: string; siteId: string }[]
}

export type PlanningView = 'day' | 'week' | 'month'
