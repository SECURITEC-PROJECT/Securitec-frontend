import { Button, Icon } from '../../../components/ui'
import type { Sheet } from '../../sheets/types'
import { newId } from '../types'
import type { Block, ImageBlock, TableBlock, TableColumn, TextBlock } from '../types'
import styles from './BlockPanel.module.css'

interface BlockPanelProps {
  block: Block
  sheets: Sheet[]
  onChange: (patch: Partial<Block>) => void
  onDelete: () => void
  onOrder: (direction: 'front' | 'back') => void
  onPickPhoto: () => void
}

/** Colonnes qu'on peut tirer d'une feuille : ses colonnes de saisie (sauf les actions), plus la date et l'auteur de saisie. */
function availableColumns(sheet: Sheet): TableColumn[] {
  return [
    ...sheet.columns.filter((column) => column.type !== 'ACTION').map((column) => ({ key: `c:${column.id}`, source: 'sheet' as const, columnId: column.id, label: column.label })),
    { key: 'date', source: 'date', label: 'Saisi le' },
    { key: 'author', source: 'author', label: 'Par' },
  ]
}

function TextPanel({ block, onChange }: { block: TextBlock; onChange: (patch: Partial<TextBlock>) => void }) {
  const { style } = block
  const set = (patch: Partial<TextBlock['style']>) => onChange({ style: { ...style, ...patch } })
  return (
    <>
      <label className={styles.field}>
        Taille du texte
        <input type="number" min={8} max={72} value={style.fontSize} onChange={(event) => set({ fontSize: Math.max(8, Math.min(72, Number(event.target.value) || 14)) })} />
      </label>
      <div className={styles.row}>
        <button type="button" className={`${styles.toggle} ${style.bold ? styles.on : ''}`} onClick={() => set({ bold: !style.bold })}>
          <b>G</b>
        </button>
        <button type="button" className={`${styles.toggle} ${style.italic ? styles.on : ''}`} onClick={() => set({ italic: !style.italic })}>
          <i>I</i>
        </button>
        {(['left', 'center', 'right'] as const).map((align) => (
          <button key={align} type="button" className={`${styles.toggle} ${style.align === align ? styles.on : ''}`} onClick={() => set({ align })}>
            {{ left: 'Gauche', center: 'Centre', right: 'Droite' }[align]}
          </button>
        ))}
      </div>
      <label className={styles.field}>
        Couleur du texte
        <input type="color" value={style.color} onChange={(event) => set({ color: event.target.value })} />
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={style.background !== 'transparent'} onChange={(event) => set({ background: event.target.checked ? '#fff7d6' : 'transparent' })} />
        Fond coloré
      </label>
      {style.background !== 'transparent' && (
        <label className={styles.field}>
          Couleur du fond
          <input type="color" value={style.background} onChange={(event) => set({ background: event.target.value })} />
        </label>
      )}
      <label className={styles.check}>
        <input type="checkbox" checked={style.border} onChange={(event) => set({ border: event.target.checked })} />
        Bordure
      </label>
    </>
  )
}

function ImagePanel({ block, onChange, onReplace }: { block: ImageBlock; onChange: (patch: Partial<ImageBlock>) => void; onReplace: () => void }) {
  return (
    <>
      <Button variant="outline" type="button" onClick={onReplace}>
        <Icon name="camera" size={16} /> {block.src ? 'Changer la photo' : 'Choisir une photo'}
      </Button>
      <label className={styles.field}>
        Affichage
        <select value={block.fit} onChange={(event) => onChange({ fit: event.target.value as ImageBlock['fit'] })}>
          <option value="contain">Photo entière</option>
          <option value="cover">Remplir le cadre (rogner)</option>
        </select>
      </label>
      <label className={styles.field}>
        Légende
        <input value={block.caption} onChange={(event) => onChange({ caption: event.target.value })} maxLength={200} placeholder="Facultative" />
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={block.border} onChange={(event) => onChange({ border: event.target.checked })} />
        Bordure
      </label>
    </>
  )
}

function TablePanel({ block, sheets, onChange }: { block: TableBlock; sheets: Sheet[]; onChange: (patch: Partial<TableBlock>) => void }) {
  const sheet = sheets.find((candidate) => candidate.id === block.sheetId)
  const available = sheet ? availableColumns(sheet) : []
  const dateColumns = sheet?.columns.filter((column) => column.type === 'DATE') ?? []
  const { style } = block
  const setStyle = (patch: Partial<TableBlock['style']>) => onChange({ style: { ...style, ...patch } })

  function chooseSheet(sheetId: string) {
    const next = sheets.find((candidate) => candidate.id === sheetId)
    // Changer de feuille repart des colonnes de cette feuille ; les valeurs manuelles étaient liées aux anciennes lignes.
    onChange({
      sheetId: next?.id ?? null,
      dateColumn: '_created',
      title: next && (block.title === 'Tableau' || sheets.some((candidate) => candidate.name === block.title)) ? next.name : block.title,
      columns: next ? availableColumns(next).filter((column) => column.source !== 'author') : [],
      manual: {},
    })
  }

  const used = (column: TableColumn) => block.columns.some((existing) => existing.key === column.key)
  const toggle = (column: TableColumn) => onChange({ columns: used(column) ? block.columns.filter((existing) => existing.key !== column.key) : [...block.columns, column] })

  return (
    <>
      <label className={styles.check}>
        <input type="checkbox" checked={block.showTitle} onChange={(event) => onChange({ showTitle: event.target.checked })} />
        Afficher un titre
      </label>
      {block.showTitle && (
        <label className={styles.field}>
          Titre
          <input value={block.title} onChange={(event) => onChange({ title: event.target.value })} maxLength={160} />
        </label>
      )}
      <label className={styles.field}>
        Feuille de saisie
        <select value={block.sheetId ?? ''} onChange={(event) => chooseSheet(event.target.value)}>
          <option value="">Choisir…</option>
          {sheets.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.postName} · {candidate.name}
            </option>
          ))}
        </select>
      </label>

      {sheet && (
        <>
          <h4 className={styles.heading}>Plage de dates</h4>
          <label className={styles.field}>
            Filtrer selon
            <select value={block.dateColumn} onChange={(event) => onChange({ dateColumn: event.target.value })}>
              <option value="_created">Date de saisie de la ligne</option>
              {dateColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  Colonne « {column.label} »
                </option>
              ))}
            </select>
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              Du
              <input type="date" value={block.from} max={block.to || undefined} onChange={(event) => onChange({ from: event.target.value })} />
            </label>
            <label className={styles.field}>
              Au
              <input type="date" value={block.to} min={block.from || undefined} onChange={(event) => onChange({ to: event.target.value })} />
            </label>
          </div>

          <h4 className={styles.heading}>Colonnes de la feuille</h4>
          {available.map((column) => (
            <label key={column.key} className={styles.check}>
              <input type="checkbox" checked={used(column)} onChange={() => toggle(column)} />
              {column.label}
            </label>
          ))}

          <h4 className={styles.heading}>Colonnes ajoutées à la main</h4>
          {block.columns
            .filter((column) => column.source === 'manual')
            .map((column) => (
              <div key={column.key} className={styles.manual}>
                <span>{column.label}</span>
                <button type="button" title="Retirer la colonne" onClick={() => onChange({ columns: block.columns.filter((existing) => existing.key !== column.key) })}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          <Button variant="outline" type="button" onClick={() => onChange({ columns: [...block.columns, { key: `m:${newId()}`, source: 'manual', label: 'Nouvelle colonne' }] })}>
            <Icon name="add" size={16} /> Ajouter une colonne
          </Button>
          <p className={styles.hint}>Renommez une colonne et glissez sa poignée ⠿ dans l’en-tête du tableau pour la déplacer. Les colonnes manuelles se remplissent directement dans le tableau.</p>
        </>
      )}

      <h4 className={styles.heading}>Apparence</h4>
      <label className={styles.field}>
        Taille du texte
        <input type="number" min={7} max={32} value={style.fontSize} onChange={(event) => setStyle({ fontSize: Math.max(7, Math.min(32, Number(event.target.value) || 12)) })} />
      </label>
      <label className={styles.field}>
        Fond de l’en-tête
        <input type="color" value={style.headerBackground} onChange={(event) => setStyle({ headerBackground: event.target.value })} />
      </label>
      <label className={styles.field}>
        Texte de l’en-tête
        <input type="color" value={style.headerColor} onChange={(event) => setStyle({ headerColor: event.target.value })} />
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={style.borders} onChange={(event) => setStyle({ borders: event.target.checked })} />
        Bordures
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={style.zebra} onChange={(event) => setStyle({ zebra: event.target.checked })} />
        Lignes alternées
      </label>
    </>
  )
}

/** Panneau de réglages du bloc sélectionné. */
export function BlockPanel({ block, sheets, onChange, onDelete, onOrder, onPickPhoto }: BlockPanelProps) {
  return (
    <aside className={styles.panel} data-print="hide">
      <h3 className={styles.title}>{{ text: 'Bloc de texte', table: 'Tableau', image: 'Photo' }[block.type]}</h3>
      {block.type === 'text' && <TextPanel block={block} onChange={onChange} />}
      {block.type === 'table' && <TablePanel block={block} sheets={sheets} onChange={onChange} />}
      {block.type === 'image' && <ImagePanel block={block} onChange={onChange} onReplace={onPickPhoto} />}
      <div className={styles.row}>
        <Button variant="outline" type="button" onClick={() => onOrder('front')}>
          Premier plan
        </Button>
        <Button variant="outline" type="button" onClick={() => onOrder('back')}>
          Arrière-plan
        </Button>
      </div>
      <Button variant="outline" type="button" onClick={onDelete}>
        <Icon name="trash" size={16} /> Supprimer ce bloc
      </Button>
    </aside>
  )
}
