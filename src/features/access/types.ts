export interface PermissionModule {
  key: string
  label: string
  actions: string[]
}

export interface PermissionGroup {
  key: string
  label: string
  modules: PermissionModule[]
}

export interface PermissionCatalog {
  /** Libellé de chaque action (view → « Consulter »). */
  actions: Record<string, string>
  groups: PermissionGroup[]
  /** Profils de base (1 = administrateur, accès à tous les sites). */
  profiles: Record<string, string>
}

export interface RoleSummary {
  id: string
  code: string
  nom: string
  description: string | null
  profilBase: number
  system: boolean
  permissionCount: number
  userCount: number
}

export interface RoleDetail extends Omit<RoleSummary, 'permissionCount' | 'userCount'> {
  permissions: string[]
}

export interface RoleInput {
  nom: string
  description: string
  profilBase: number
  permissions: string[]
}

export interface AccessUser {
  id: string
  name: string
  identifier: string
  matricule: string
  profile: number
  active: boolean
  siteId: string | null
  siteName: string | null
  roleAccessId: string | null
  roleAccessName: string | null
}

export interface UserInput {
  name: string
  identifier: string
  matricule: string
  roleAccessId: string
  siteId: string | null
  /** Obligatoire à la création ; à l'édition, vide = PIN inchangé. */
  pin: string
  active?: boolean
}
