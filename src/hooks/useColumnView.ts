import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface ColumnView {
  sort?: { key: string; direction: SortDirection }
  filters: Record<string, string>
  showFilters: boolean
  /** Trie sur la colonne : croissant, puis décroissant, puis retour à l'ordre d'origine. */
  toggleSort: (key: string) => void
  setFilter: (key: string, value: string) => void
  toggleFilters: () => void
  clearFilters: () => void
  activeFilterCount: number
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Tri et filtres par colonne d'un tableau. `text(row, key)` donne le texte affiché de la cellule (filtre) ;
 * `sortValue(row, key)` donne la valeur de tri (par défaut le texte), ex. la date ISO plutôt que « 06/11/2026 ».
 */
export function useColumnView<T>(rows: T[], text: (row: T, key: string) => string, sortValue?: (row: T, key: string) => string) {
  const [sort, setSort] = useState<ColumnView['sort']>()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)

  const view = useMemo(() => {
    const active = Object.entries(filters).filter(([, value]) => value.trim() !== '')
    let result = rows
    if (active.length > 0) {
      result = rows.filter((row) => active.every(([key, value]) => normalize(text(row, key)).includes(normalize(value.trim()))))
    }
    if (sort) {
      const factor = sort.direction === 'asc' ? 1 : -1
      const read = (row: T) => (sortValue ?? text)(row, sort.key)
      result = [...result].sort((a, b) => factor * read(a).localeCompare(read(b), 'fr', { numeric: true, sensitivity: 'base' }))
    }
    return result
  }, [rows, filters, sort, text, sortValue])

  const controls: ColumnView = {
    sort,
    filters,
    showFilters,
    toggleSort: (key) =>
      setSort((current) => (current?.key !== key ? { key, direction: 'asc' } : current.direction === 'asc' ? { key, direction: 'desc' } : undefined)),
    setFilter: (key, value) => setFilters((current) => ({ ...current, [key]: value })),
    toggleFilters: () => setShowFilters((value) => !value),
    clearFilters: () => setFilters({}),
    activeFilterCount: Object.values(filters).filter((value) => value.trim() !== '').length,
  }

  return { rows: view, controls }
}
