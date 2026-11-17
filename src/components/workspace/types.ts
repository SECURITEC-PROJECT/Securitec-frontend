export type FieldType = 'text' | 'number' | 'time' | 'date' | 'select' | 'textarea' | 'checkbox'

/** Champ d'une cellule ou d'une ligne de saisie modifiable. */
export interface RegisterField {
  key: string
  label: string
  type: FieldType
  required?: boolean
}
