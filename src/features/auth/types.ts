export interface LoginCredentials {
  identifier: string
  pin: string
}

export interface SessionUser {
  id: string
  name: string
  identifier: string
  matricule: string
  /** Profil de base (1 = administrateur : tous les sites). */
  profile: number
  roleLabel: string
  siteId: string | null
  siteName: string | null
  permissions: string[]
}
