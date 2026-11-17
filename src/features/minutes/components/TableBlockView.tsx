import { useMemo, useState } from 'react'
import type { Sheet, SheetRow } from '../../sheets/types'
import type { TableBlock, TableColumn } from '../types'
import styles from './Blocks.module.css'

const localDate = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDay = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR') : '')
const formatDateTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

/** Lignes de la feuille comprises dans la plage de dates du tableau, de la plus ancienne à la plus récente. */
function filterRows(block: TableBlock, rows: SheetRow[]) {
  return rows
    .filter((row) => {
      const day = block.dateColumn === '_created' ? localDate(row.createdAt) : (row.values[block.dateColumn] ?? '')
      if (!day) return !block.from && !block.to
      return (!block.from || day >= block.from) && (!block.to || day <= block.to)
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function cellText(column: TableColumn, row: SheetRow, sheet: Sheet) {
  if (column.source === 'date') return formatDateTime(row.createdAt)
  if (column.source === 'author') return row.author ?? ''
  const sheetColumn = sheet.columns.find((candidate) => candidate.id === column.columnId)
  const value = row.values[column.columnId ?? ''] ?? ''
  return sheetColumn?.type === 'DATE' ? formatDay(value) : value
}

function rangeLabel(from: string, to: string) {
  if (from && to) return `Du ${formatDay(from)} au ${formatDay(to)}`
  return from ? `À partir du ${formatDay(from)}` : `Jusqu’au ${formatDay(to)}`
}

interface TableBlockViewProps {
  block: TableBlock
  sheet: Sheet | undefined
  /** `undefined` tant que les lignes se chargent. */
  rows: SheetRow[] | undefined
  editing: boolean
  onChange: (patch: Partial<TableBlock>) => void
}

/** Tableau d'un compte rendu : lignes d'une feuille de saisie sur une plage de dates, plus des colonnes remplies à la main. Les colonnes se réordonnent en glissant leur poignée. */
export function TableBlockView({ block, sheet, rows, editing, onChange }: TableBlockViewProps) {
  const [dragKey, setDragKey] = useState<string>()
  const [overKey, setOverKey] = useState<string>()
  const visible = useMemo(() => (rows ? filterRows(block, rows) : []), [block, rows])

  const setLabel = (key: string, label: string) => onChange({ columns: block.columns.map((column) => (column.key === key ? { ...column, label } : column)) })
  const setManual = (rowId: string, key: string, value: string) => onChange({ manual: { ...block.manual, [rowId]: { ...block.manual[rowId], [key]: value } } })

  function drop(targetKey: string) {
    if (dragKey && dragKey !== targetKey) {
      const columns = [...block.columns]
      const [moved] = columns.splice(columns.findIndex((column) => column.key === dragKey), 1)
      columns.splice(columns.findIndex((column) => column.key === targetKey), 0, moved)
      onChange({ columns })
    }
    setDragKey(undefined)
    setOverKey(undefined)
  }

  const { style } = block
  const border = style.borders ? '1px solid #b9bdd0' : 'none'
  const empty = !sheet ? 'Choisissez une feuille de saisie dans le panneau de réglages.' : block.columns.length === 0 ? 'Ajoutez des colonnes dans le panneau de réglages.' : undefined

  return (
    <div className={styles.table} style={{ fontSize: style.fontSize }}>
      {block.showTitle && <div className={styles.tableTitle}>{block.title}</div>}
      {(block.from || block.to) && <div className={styles.range}>{rangeLabel(block.from, block.to)}</div>}
      {empty ? (
        <p className={styles.placeholder}>{empty}</p>
      ) : (
        <table className={styles.grid}>
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th
                  key={column.key}
                  style={{ background: style.headerBackground, color: style.headerColor, border, outline: overKey === column.key && dragKey !== column.key ? '2px solid #2f7fd8' : undefined }}
                  onDragOver={(event) => {
                    if (!dragKey) return
                    event.preventDefault()
                    setOverKey(column.key)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    drop(column.key)
                  }}
                >
                  {editing ? (
                    <span className={styles.headCell}>
                      <span
                        className={styles.columnGrip}
                        draggable
                        title="Glisser pour changer la position de la colonne"
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', column.key)
                          setDragKey(column.key)
                        }}
                        onDragEnd={() => {
                          setDragKey(undefined)
                          setOverKey(undefined)
                        }}
                      >
                        ⠿
                      </span>
                      <input className={styles.headInput} value={column.label} onChange={(event) => setLabel(column.key, event.target.value)} aria-label="Nom de la colonne" />
                    </span>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === undefined && (
              <tr>
                <td colSpan={block.columns.length} className={styles.placeholder}>
                  Chargement…
                </td>
              </tr>
            )}
            {rows && visible.length === 0 && (
              <tr>
                <td colSpan={block.columns.length} className={styles.placeholder}>
                  Aucune ligne sur cette période.
                </td>
              </tr>
            )}
            {sheet &&
              visible.map((row, index) => (
                <tr key={row.id} style={{ background: style.zebra && index % 2 === 1 ? '#f6f7fb' : undefined }}>
                  {block.columns.map((column) => (
                    <td key={column.key} style={{ border }}>
                      {column.source === 'manual' ? (
                        <input className={styles.cellInput} value={block.manual[row.id]?.[column.key] ?? ''} onChange={(event) => setManual(row.id, column.key, event.target.value)} aria-label={column.label} />
                      ) : (
                        cellText(column, row, sheet)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
