import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { Badge, Icon } from '../../../components/ui'
import { DataTable, FloatingPagination, GridCell, WorkspaceLayout } from '../../../components/workspace'
import type { DataColumn } from '../../../components/workspace'
import { useColumnView } from '../../../hooks/useColumnView'
import { usePagination } from '../../../hooks/usePagination'
import { usePermissions } from '../../auth'
import { DirectoryDraftRow } from '../components/DirectoryDraftRow'
import { DirectorySidebar } from '../components/DirectorySidebar'
import { useDirectory } from '../hooks/useDirectory'
import { useLookups } from '../hooks/useLookups'
import type { DirectoryConfig, DirectoryRow } from '../types'
import { fieldOptions, isExpired, matchesQuery, toRegisterField } from '../utils'
import styles from './DirectoryPage.module.css'

/** Page d'annuaire générique : liste, recherche, création, modification, désactivation ou suppression. */
export function DirectoryPage({ config }: { config: DirectoryConfig }) {
  const site = useCurrentSite()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { rows, loading, error, save, toggleActive, remove } = useDirectory(config, site.id)
  const lookups = useLookups(config.fields.some((field) => field.options === 'sites'))
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')
  // « Ajouter une ligne » ouvre une ligne de saisie en tête du tableau ; les lignes existantes se modifient cellule par cellule.
  const [adding, setAdding] = useState(false)

  const canCreate = !config.createElsewhere && config.limits?.create !== false && can(`${config.module}.create`)
  const canUpdate = config.limits?.update !== false && can(`${config.module}.update`)
  const canDelete = !!config.remove && config.limits?.delete !== false && can(`${config.module}.delete`)
  const canToggle = !!config.setActive && canUpdate

  const visible = useMemo(
    () => rows.filter((row) => (!config.setActive || status === 'all' || (status === 'active') === row.active) && matchesQuery(row, query)),
    [rows, status, query, config.setActive],
  )
  const { rows: shown, controls: view } = useColumnView(visible, (row, key) => row.values[key] ?? '')
  const pagination = usePagination(shown)

  const columns: DataColumn<DirectoryRow>[] = [
    ...config.columns.map((column, index) => ({
      key: column.key,
      label: column.label,
      render: (row: DirectoryRow) => {
        if (index === 0 && config.rowPath) {
          return (
            <button type="button" className={styles.link} onClick={() => navigate(config.rowPath!(site.id, row))} title="Ouvrir les paramètres">
              {row.values[column.key] || '—'}
            </button>
          )
        }
        const field = config.fields.find((candidate) => candidate.key === (column.field ?? column.key))
        const value = row.values[column.key] ?? ''
        if (!field || column.render) return column.render ? column.render(row) : value || '—'
        return (
          <GridCell
            key={`${row.id}:${field.key}:${row.values[field.key] ?? ''}`}
            field={toRegisterField(field)}
            value={row.values[field.key] ?? ''}
            display={value}
            options={fieldOptions(field, lookups)}
            editable={canUpdate && !field.lockedOnEdit}
            alwaysEditing={config.spreadsheet}
            tone={field.key === 'expirationPermis' && value ? (isExpired(value) ? 'danger' : 'success') : undefined}
            onCommit={(next) => save(row, { ...row.values, [field.key]: String(next) })}
          />
        )
      },
    })),
    ...(config.setActive
      ? [
          {
            key: '_status',
            label: 'Statut',
            render: (row: DirectoryRow) => (
              <Badge tone={row.active ? 'success' : 'neutral'}>{(config.statusLabels ?? ['Actif', 'Inactif'])[row.active ? 0 : 1]}</Badge>
            ),
          },
        ]
      : []),
  ]

  const handleRemove = (row: DirectoryRow) => {
    if (window.confirm('Supprimer définitivement cette fiche ?')) void remove(row)
  }

  return (
    <WorkspaceLayout
      sidebar={
        <DirectorySidebar
          title={config.title}
          subtitle={site.name}
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={config.searchPlaceholder}
          filters={
            config.setActive
              ? [
                  { key: 'all', label: 'Tous', count: rows.length },
                  {
                    key: 'active',
                    label: (config.statusLabels ?? ['Actifs', 'Inactifs'])[0],
                    count: rows.filter((row) => row.active).length,
                  },
                  {
                    key: 'inactive',
                    label: (config.statusLabels ?? ['Actifs', 'Inactifs'])[1],
                    count: rows.filter((row) => !row.active).length,
                  },
                ]
              : [{ key: 'all', label: 'Tous', count: rows.length }]
          }
          filter={config.setActive ? status : 'all'}
          onFilterChange={(key) => setStatus(key as typeof status)}
          newLabel={config.createElsewhere || config.spreadsheet ? undefined : 'Ajouter une ligne'}
          onNew={canCreate ? () => setAdding((value) => !value) : undefined}
        />
      }
    >
      <div className={styles.titleBar}>
        <h1 className={styles.title}>{config.title}</h1>
        <div className={styles.tools}>
          {view.activeFilterCount > 0 && (
            <button type="button" className={styles.tool} onClick={view.clearFilters}>
              Effacer les filtres ({view.activeFilterCount})
            </button>
          )}
          <button type="button" className={`${styles.tool} ${view.showFilters ? styles.toolActive : ''}`} onClick={view.toggleFilters} aria-pressed={view.showFilters}>
            Filtres par colonne
          </button>
        </div>
      </div>
      <p className={styles.subtitle}>{config.subtitle}</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className={styles.status}>Chargement...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={pagination.pageItems}
          rowKey={(row) => row.id}
          emptyText={config.emptyText}
          view={view}
          grid={config.spreadsheet}
          rowTone={config.rowTone}
          selectedKey={config.highlightId}
          entryRow={
            canCreate &&
            (adding || config.spreadsheet) && (
              <DirectoryDraftRow
                config={config}
                siteId={site.id}
                lookups={lookups}
                onSubmit={(values) => save(undefined, values)}
                persistent={config.spreadsheet}
                onClose={() => setAdding(false)}
              />
            )
          }
          leading={(row) => (
            <>
              {canToggle && (
                <button
                  type="button"
                  className={styles.icon}
                  onClick={() => void toggleActive(row)}
                  title={row.active ? 'Désactiver / mettre en maintenance' : 'Réactiver'}
                  aria-label={row.active ? 'Désactiver' : 'Réactiver'}
                >
                  <Icon name="shield" size={15} color={row.active ? 'var(--color-danger)' : '#2e9e6a'} />
                </button>
              )}
              {config.detailRow && (
                <button type="button" className={styles.icon} onClick={() => config.detailRow!(row)} title="Voir le détail de la ligne" aria-label="Voir le détail de la ligne">
                  <Icon name="eye" size={15} color="var(--color-info)" />
                </button>
              )}
              {config.reportRow && (
                <button type="button" className={styles.icon} onClick={() => config.reportRow!(row)} title={config.reportLabel ?? 'Signaler au supérieur'} aria-label={config.reportLabel ?? 'Signaler au supérieur'}>
                  <Icon name="flag" size={15} color="#f5a623" />
                </button>
              )}
              {canDelete && (
                <button type="button" className={styles.icon} onClick={() => handleRemove(row)} title="Supprimer" aria-label="Supprimer">
                  <Icon name="trash" size={15} color="var(--color-danger)" />
                </button>
              )}
            </>
          )}
        />
      )}

      <FloatingPagination
        total={shown.length}
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </WorkspaceLayout>
  )
}
