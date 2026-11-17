import type { RegisterField } from '../../components/workspace'
import type { DirectoryField, DirectoryLookups, DirectoryRow, Option, Values } from './types'

export const text = (value: string | null | undefined) => value ?? ''

export function fieldOptions(field: DirectoryField, lookups: DirectoryLookups): Option[] {
  const options = field.options === 'sites' ? lookups.sites : (field.options ?? [])
  return field.required ? options : [{ value: '', label: '—' }, ...options]
}

export function initialValues(fields: DirectoryField[], siteId: string, row?: DirectoryRow): Values {
  return Object.fromEntries(fields.map((field) => [field.key, row ? (row.values[field.key] ?? '') : field.defaultFromSite ? siteId : '']))
}

export const matchesQuery = (row: DirectoryRow, query: string) => {
  const needle = query.trim().toLowerCase()
  return !needle || Object.values(row.values).some((value) => value.toLowerCase().includes(needle))
}

export const isExpired = (isoDate: string) => !!isoDate && isoDate < new Date().toISOString().slice(0, 10)

/** Champ d'annuaire vu comme champ de cahier, pour réutiliser les contrôles de saisie en tableau. */
export const toRegisterField = (field: DirectoryField): RegisterField => ({ key: field.key, label: field.label, type: field.type, required: field.required })
