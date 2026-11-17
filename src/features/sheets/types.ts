export type ColumnType = 'TEXT' | 'NUMBER' | 'DATE' | 'TIME' | 'SELECT' | 'CHECKBOX' | 'ACTION'

/** Ce que fait une colonne de type « Action » (d'autres actions pourront s'ajouter). */
export type ColumnAction = 'ATTACH_FILES'

export const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'TEXT', label: 'Texte' },
  { value: 'NUMBER', label: 'Nombre' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Heure' },
  { value: 'SELECT', label: 'Liste de choix' },
  { value: 'CHECKBOX', label: 'Oui / Non' },
  { value: 'ACTION', label: 'Action' },
]

export const COLUMN_ACTIONS: { value: ColumnAction; label: string }[] = [{ value: 'ATTACH_FILES', label: 'Attacher des fichiers' }]

/** En-tête de colonne : son identifiant est la clé de sa valeur dans chaque ligne. */
export interface SheetColumn {
  id: string
  label: string
  type: ColumnType
  required: boolean
  options: string[]
  /** Renseigné quand le type est « Action ». */
  action: ColumnAction | null
  /** Action « Attacher des fichiers » : envoi de fichiers depuis l'appareil. */
  allowUpload: boolean
  /** Action « Attacher des fichiers » : prise de photo avec la caméra. */
  allowPhoto: boolean
}

/** Feuille de saisie d'un poste (un « onglet » avec ses propres colonnes). */
export interface Sheet {
  id: string
  postId: string
  postName: string
  siteId: string
  /** Utilisateurs affectés au poste : seuls à pouvoir voir et remplir les feuilles du poste. */
  postUsers: { id: string; name: string }[]
  name: string
  /** Droits des utilisateurs sur les lignes de la feuille (tout à faux : lecture seule). */
  allowCreate: boolean
  allowUpdate: boolean
  allowDelete: boolean
  columns: SheetColumn[]
}

/** Colonne en cours d'édition dans le constructeur ; `id` est absent tant qu'elle n'est pas enregistrée. */
export interface ColumnDraft {
  key: string
  id?: string
  label: string
  type: ColumnType
  required: boolean
  options: string
  action: ColumnAction
  allowUpload: boolean
  allowPhoto: boolean
}

export interface SheetRow {
  id: string
  /** Valeur de chaque colonne, par identifiant de colonne. */
  values: Record<string, string>
  createdAt: string
  author: string | null
  /** Nombre de fichiers joints, par identifiant de colonne « Action ». */
  fileCounts: Record<string, number>
  /** Signalements non traités à propos de cette ligne (elle est affichée en rouge tant qu'il en reste). */
  openReports: number
}

/** Signalement fait à propos d'une ligne. */
export interface RowReport {
  id: string
  reporter: string
  toLabel: string
  message: string
  createdAt: string
  resolved: boolean
  resolvedBy: string | null
}

/** Fichier joint à une ligne. */
export interface SheetFile {
  id: string
  name: string
  extension: string
  size: number
  createdAt: string
}

/** Ce que les utilisateurs peuvent faire sur les lignes d'une feuille. */
export interface SheetRights {
  allowCreate: boolean
  allowUpdate: boolean
  allowDelete: boolean
}

/** Résumé lisible des droits d'une feuille (« Lecture seule », « Ajout seul »…). */
export function describeRights({ allowCreate, allowUpdate, allowDelete }: SheetRights) {
  if (!allowCreate && !allowUpdate && !allowDelete) return 'Lecture seule'
  const actions = [allowCreate && 'ajouter', allowUpdate && 'modifier', allowDelete && 'supprimer'].filter(Boolean) as string[]
  if (allowCreate && !allowUpdate && !allowDelete) return 'Ajout seul (les lignes saisies ne se modifient ni ne se suppriment)'
  return `Peut ${actions.join(', ').replace(/, ([^,]*)$/, ' et $1')}`
}
