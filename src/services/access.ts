import { api } from '../lib/api'
import type {
  AccessUser,
  PermissionCatalog,
  RoleDetail,
  RoleInput,
  RoleSummary,
  UserInput,
} from '../features/access/types'

export const fetchCatalog = () => api<PermissionCatalog>('/permissions/catalog')

export const fetchRoles = async () => (await api<{ roles: RoleSummary[] }>('/roles')).roles

export const fetchRole = async (id: string) => (await api<{ role: RoleDetail }>(`/roles/${id}`)).role

export const createRole = async (input: RoleInput) => (await api<{ role: RoleDetail }>('/roles', { method: 'POST', body: input })).role

export const updateRole = async (id: string, input: RoleInput) =>
  (await api<{ role: RoleDetail }>(`/roles/${id}`, { method: 'PUT', body: input })).role

export const deleteRole = (id: string) => api<{ id: string }>(`/roles/${id}`, { method: 'DELETE' })

export const fetchUsers = async () => (await api<{ users: AccessUser[] }>('/users')).users

export const createUser = async (input: UserInput) => (await api<{ user: AccessUser }>('/users', { method: 'POST', body: input })).user

export const updateUser = async (id: string, input: UserInput) =>
  (await api<{ user: AccessUser }>(`/users/${id}`, { method: 'PUT', body: input })).user

export const deactivateUser = (id: string) => api<{ id: string }>(`/users/${id}`, { method: 'DELETE' })

/** Droits d'un utilisateur : ceux de son rôle, les ajustements individuels et le résultat. */
export interface UserPermissions {
  profile: number
  roleName: string | null
  rolePermissions: string[]
  granted: string[]
  revoked: string[]
  effective: string[]
}

export const fetchUserPermissions = (id: string) => api<UserPermissions>(`/users/${id}/permissions`)

/** Enregistre l'ensemble de permissions voulu ; le Backend en déduit les ajustements par rapport au rôle. */
export const saveUserPermissions = (id: string, permissions: string[]) =>
  api<UserPermissions>(`/users/${id}/permissions`, { method: 'PUT', body: { permissions } })
