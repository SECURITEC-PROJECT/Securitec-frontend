import type { ReactNode } from 'react'

export type Values = Record<string, string>

export interface Option {
  value: string
  label: string
}

/** Une ligne d'annuaire : valeurs en texte (pour le formulaire et la recherche) + état actif. */
export interface DirectoryRow {
  id: string
  values: Values
  active: boolean
}

export interface DirectoryField {
  key: string
  label: string
  type: 'text' | 'number' | 'time' | 'date' | 'select'
  required?: boolean
  /** Liste fixe, ou liste fournie par l'application (entreprises, sites). */
  options?: Option[] | 'sites'
  /** Le champ n'est plus modifiable après la création. */
  lockedOnEdit?: boolean
  /** Valeur initiale : le site ouvert. */
  defaultFromSite?: boolean
}

export interface DirectoryColumn {
  key: string
  label: string
  /** Champ modifié dans cette colonne quand sa clé d'affichage diffère (ex. colonne « provider » → champ « providerId »). */
  field?: string
  render?: (row: DirectoryRow) => ReactNode
}

export interface DirectoryLookups {
  sites: Option[]
}

export interface DirectoryConfig {
  key: string
  /** Module de permissions (ex. « employees » → employees.create). */
  module: string
  title: string
  subtitle: string
  /** « un employé » — utilisé dans les messages. */
  newLabel: string
  /** La création se fait ailleurs (fenêtre des paramètres du projet) : la page ne propose que la liste et la modification. */
  createElsewhere?: boolean
  /** Mode tableur : cellules toujours éditables et ligne de saisie toujours prête, comme dans Excel. */
  spreadsheet?: boolean
  /** Restrictions propres à la page, en plus des permissions du rôle (ex. droits d'une feuille de saisie). `false` interdit l'action. */
  /** Bouton « Signaler au supérieur » sur chaque ligne : reçoit la ligne concernée. Doit être une fonction stable (ex. un setter d'état). */
  reportRow?: (row: DirectoryRow) => void
  /** Bouton « œil » sur chaque ligne : affiche le détail de la ligne. Doit être une fonction stable (ex. un setter d'état). */
  detailRow?: (row: DirectoryRow) => void
  /** Colore une ligne selon son contenu (ex. signalement ouvert : « danger » = rouge). */
  rowTone?: (row: DirectoryRow) => 'danger' | undefined
  /** Identifiant de la ligne à mettre en avant et à amener à l'écran. */
  highlightId?: string
  /** Libellé du bouton de signalement. */
  reportLabel?: string
  limits?: { create?: boolean; update?: boolean; delete?: boolean }
  /** Adresse de la fiche d'une ligne : son premier champ devient un lien qui l'ouvre. */
  rowPath?: (siteId: string, row: DirectoryRow) => string
  searchPlaceholder: string
  emptyText: string
  /** Libellés du statut [actif, inactif] ; par défaut « Actif » / « Inactif ». */
  statusLabels?: [string, string]
  fields: DirectoryField[]
  columns: DirectoryColumn[]
  load: (siteId: string) => Promise<DirectoryRow[]>
  create: (siteId: string, values: Values) => Promise<unknown>
  update: (siteId: string, row: DirectoryRow, values: Values) => Promise<unknown>
  /** Suppression réelle (transporteurs, chauffeurs). */
  remove?: (siteId: string, row: DirectoryRow) => Promise<unknown>
  /** Activation / désactivation (employés, entreprises, postes). */
  setActive?: (siteId: string, row: DirectoryRow, active: boolean) => Promise<unknown>
}
