import type { PermissionGroup, PermissionModule } from './types'

export type CheckState = 'all' | 'some' | 'none'

export const permissionKey = (module: PermissionModule, action: string) => `${module.key}.${action}`

const modulePermissions = (module: PermissionModule) => module.actions.map((action) => permissionKey(module, action))

function stateOf(keys: string[], selected: Set<string>): CheckState {
  const count = keys.filter((key) => selected.has(key)).length
  if (count === 0) return 'none'
  return count === keys.length ? 'all' : 'some'
}

export const moduleState = (selected: Set<string>, module: PermissionModule) => stateOf(modulePermissions(module), selected)

export const groupState = (selected: Set<string>, group: PermissionGroup) =>
  stateOf(group.modules.flatMap(modulePermissions), selected)

/**
 * Coche ou décoche une action. Créer, modifier, supprimer… supposent de pouvoir consulter ;
 * retirer « Consulter » retire donc toutes les actions du module.
 */
export function toggleAction(selected: Set<string>, module: PermissionModule, action: string): Set<string> {
  const next = new Set(selected)
  const key = permissionKey(module, action)
  const view = permissionKey(module, 'view')

  if (next.has(key)) {
    if (action === 'view') modulePermissions(module).forEach((permission) => next.delete(permission))
    else next.delete(key)
  } else {
    next.add(key)
    if (module.actions.includes('view')) next.add(view)
  }
  return next
}

export function setModule(selected: Set<string>, module: PermissionModule, on: boolean): Set<string> {
  const next = new Set(selected)
  modulePermissions(module).forEach((permission) => (on ? next.add(permission) : next.delete(permission)))
  return next
}

export function setGroup(selected: Set<string>, group: PermissionGroup, on: boolean): Set<string> {
  return group.modules.reduce((current, module) => setModule(current, module, on), selected)
}
