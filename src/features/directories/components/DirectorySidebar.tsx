import { ActionList, FilterList, WorkspaceSidebar } from '../../../components/workspace'
import type { FilterItem } from '../../../components/workspace'
import styles from './DirectorySidebar.module.css'

interface DirectorySidebarProps {
  title: string
  subtitle: string
  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder: string
  filters: FilterItem<string>[]
  filter: string
  onFilterChange: (key: string) => void
  /** Absent : la création n'est pas proposée sur cette page. */
  newLabel?: string
  /** Absent si l'utilisateur ne peut pas créer. */
  onNew?: () => void
}

/** Panneau de gauche d'un annuaire : recherche, filtres avec compteurs, création et import. */
export function DirectorySidebar({ title, subtitle, query, onQueryChange, searchPlaceholder, filters, filter, onFilterChange, newLabel, onNew }: DirectorySidebarProps) {
  return (
    <WorkspaceSidebar title={title} subtitle={subtitle}>
      <input className={styles.search} type="search" placeholder={searchPlaceholder} value={query} onChange={(event) => onQueryChange(event.target.value)} />
      <FilterList items={filters} value={filter} onChange={onFilterChange} />
      <ActionList
        actions={[
          ...(newLabel ? [{ icon: 'add' as const, color: 'var(--color-info)', label: newLabel, onClick: onNew }] : []),
          { icon: 'print', color: 'var(--color-muted)', label: 'Imprimer', onClick: () => window.print() },
        ]}
      />
    </WorkspaceSidebar>
  )
}
