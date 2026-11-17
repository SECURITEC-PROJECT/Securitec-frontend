/** Compte rendu : une page libre où l'on place des blocs (texte, tableaux tirés des feuilles de saisie). */

export type Orientation = 'portrait' | 'landscape'

/** Largeur de la page en pixels : calée sur la zone imprimable d'une feuille A4 (marges de 10 mm). */
export const PAGE_WIDTH: Record<Orientation, number> = { portrait: 716, landscape: 1040 }
export const PAGE_MIN_HEIGHT: Record<Orientation, number> = { portrait: 1000, landscape: 700 }
/** Les blocs se calent sur cette grille quand on les déplace ou les redimensionne. */
export const GRID = 4

interface BlockBase {
  id: string
  x: number
  y: number
  w: number
}

export interface TextStyle {
  fontSize: number
  bold: boolean
  italic: boolean
  align: 'left' | 'center' | 'right'
  color: string
  background: string
  border: boolean
}

export interface TextBlock extends BlockBase {
  type: 'text'
  h: number
  text: string
  style: TextStyle
}

/**
 * Colonne d'un tableau :
 * - `sheet` : une colonne de la feuille de saisie (`columnId`) ;
 * - `date` / `author` : date et auteur de saisie de la ligne ;
 * - `manual` : colonne ajoutée à la main, remplie ligne par ligne dans le compte rendu.
 */
export interface TableColumn {
  key: string
  source: 'sheet' | 'date' | 'author' | 'manual'
  columnId?: string
  label: string
}

export interface TableStyle {
  fontSize: number
  headerBackground: string
  headerColor: string
  zebra: boolean
  borders: boolean
}

export interface TableBlock extends BlockBase {
  type: 'table'
  title: string
  showTitle: boolean
  sheetId: string | null
  /** Colonne dont la date sert à filtrer les lignes : `_created` (date de saisie) ou l'identifiant d'une colonne « Date ». */
  dateColumn: string
  /** Plage de dates (AAAA-MM-JJ) ; vide = sans limite de ce côté. */
  from: string
  to: string
  columns: TableColumn[]
  /** Valeurs des colonnes manuelles : identifiant de ligne → clé de colonne → texte. */
  manual: Record<string, Record<string, string>>
  style: TableStyle
}

/** Photo posée sur la page : l'image est enregistrée avec le compte rendu (réduite avant l'envoi). */
export interface ImageBlock extends BlockBase {
  type: 'image'
  h: number
  /** Image en data URL, vide tant qu'aucune photo n'est choisie. */
  src: string
  /** `contain` montre toute la photo, `cover` remplit le cadre en la rognant. */
  fit: 'contain' | 'cover'
  border: boolean
  caption: string
}

export type Block = TextBlock | TableBlock | ImageBlock

export interface MinutesLayout {
  page: { orientation: Orientation }
  blocks: Block[]
}

export interface MinutesSummary {
  id: string
  siteId: string
  name: string
  updatedAt: string
}

export interface Minutes extends MinutesSummary {
  layout: MinutesLayout
}

export const DEFAULT_TEXT_STYLE: TextStyle = { fontSize: 14, bold: false, italic: false, align: 'left', color: '#1d1d1f', background: 'transparent', border: false }
export const DEFAULT_TABLE_STYLE: TableStyle = { fontSize: 12, headerBackground: '#eef0f6', headerColor: '#1d1d1f', zebra: true, borders: true }

export const newId = () => crypto.randomUUID()

export const newTextBlock = (x: number, y: number): TextBlock => ({ id: newId(), type: 'text', x, y, w: 300, h: 80, text: 'Votre texte…', style: { ...DEFAULT_TEXT_STYLE } })

export const newImageBlock = (x: number, y: number): ImageBlock => ({ id: newId(), type: 'image', x, y, w: 240, h: 180, src: '', fit: 'contain', border: false, caption: '' })

export const newTableBlock = (x: number, y: number, width: number): TableBlock => ({
  id: newId(),
  type: 'table',
  x,
  y,
  w: width,
  title: 'Tableau',
  showTitle: true,
  sheetId: null,
  dateColumn: '_created',
  from: '',
  to: '',
  columns: [],
  manual: {},
  style: { ...DEFAULT_TABLE_STYLE },
})

/** Lit une mise en page enregistrée (éventuellement vide ou ancienne) sans faire planter l'éditeur. */
export function readLayout(raw: unknown): MinutesLayout {
  const layout = raw as Partial<MinutesLayout> | null
  const orientation: Orientation = layout?.page?.orientation === 'landscape' ? 'landscape' : 'portrait'
  return { page: { orientation }, blocks: Array.isArray(layout?.blocks) ? layout.blocks : [] }
}
