import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { ColumnView } from '../../../hooks/useColumnView'
import styles from './DataTable.module.css'

export interface DataColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  /** Colonne sans tri ni filtre (ex. « Statut » calculé). */
  unsortable?: boolean
}

interface DataTableProps<T> {
  columns: DataColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  selectedKey?: string | number
  onRowClick?: (row: T) => void
  /** Colonne étroite à gauche (icônes d'action). */
  leading?: (row: T) => ReactNode
  /** Ligne de saisie rapide placée sous l'en-tête ; elle doit fournir une cellule par colonne (+ la colonne `leading`). */
  entryRow?: ReactNode
  /** Message affiché quand il n'y a aucune ligne (et pas de ligne de saisie). */
  emptyText?: string
  /** Tri et filtres par colonne (voir `useColumnView`) : un clic sur l'en-tête trie, la ligne de filtres s'affiche à la demande. */
  view?: ColumnView
  /** Quadrillage façon tableur (bordures entre les colonnes). */
  grid?: boolean
  /** Colore une ligne (ex. « danger » : en rouge) selon son contenu. */
  rowTone?: (row: T) => 'danger' | undefined
}

/** Tableau de données des pages CRM : en-tête en capitales, badges dans les cellules, ligne de saisie optionnelle. */
export function DataTable<T>({ columns, rows, rowKey, selectedKey, onRowClick, leading, entryRow, emptyText, view, grid, rowTone }: DataTableProps<T>) {
  const isEmpty = rows.length === 0 && !entryRow
  const wrapper = useRef<HTMLDivElement>(null)
  const scrolledTo = useRef<unknown>(undefined)

  // La ligne mise en avant (ex. celle d'un signalement) est amenée à l'écran une fois.
  useEffect(() => {
    if (selectedKey === undefined || scrolledTo.current === selectedKey) return
    const target = Array.from(wrapper.current?.querySelectorAll<HTMLElement>('[data-row-key]') ?? []).find((element) => element.dataset.rowKey === String(selectedKey))
    if (!target) return
    scrolledTo.current = selectedKey
    target.scrollIntoView({ block: 'center' })
  }, [selectedKey, rows])

  return (
    <div ref={wrapper} className={styles.wrapper}>
      <table className={`${styles.table} ${grid ? styles.grid : ''}`}>
        <thead>
          <tr>
            {(leading || entryRow) && <th className={styles.leading} />}
            {columns.map((column) => {
              const sorted = view?.sort?.key === column.key ? view.sort.direction : undefined
              return (
                <th key={column.key} aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}>
                  {view && !column.unsortable ? (
                    <button type="button" className={styles.sort} onClick={() => view.toggleSort(column.key)} title="Trier sur cette colonne">
                      {column.label}
                      <span className={`${styles.arrow} ${sorted ? styles.arrowActive : ''}`}>{sorted === 'desc' ? '▼' : '▲'}</span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
          {view?.showFilters && (
            <tr className={styles.filters}>
              {(leading || entryRow) && <th className={styles.leading} />}
              {columns.map((column) => (
                <th key={column.key}>
                  {!column.unsortable && (
                    <input
                      type="search"
                      className={styles.filter}
                      value={view.filters[column.key] ?? ''}
                      placeholder="Filtrer"
                      aria-label={`Filtrer : ${column.label}`}
                      onChange={(event) => view.setFilter(column.key, event.target.value)}
                    />
                  )}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {entryRow}
          {rows.map((row) => {
            const key = rowKey(row)
            return (
              <tr
                key={key}
                data-row-key={String(key)}
                className={`${onRowClick ? styles.clickable : ''} ${key === selectedKey ? styles.selected : ''} ${rowTone?.(row) === 'danger' ? styles.danger : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {leading && <td className={styles.leading}>{leading(row)}</td>}
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {isEmpty && <p className={styles.empty}>{emptyText ?? 'Aucune donnée.'}</p>}
    </div>
  )
}
