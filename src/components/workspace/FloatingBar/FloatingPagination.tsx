import { Icon } from '../../ui'
import { CountPill, FloatingBar } from './FloatingBar'
import styles from './FloatingPagination.module.css'

interface FloatingPaginationProps {
  total: number
  page: number
  pageCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  /** Absent si l'utilisateur ne peut pas créer : le bouton « + » n'est alors pas affiché. */
  onAdd?: () => void
  onExportPdf?: () => void
  onExportExcel?: () => void
}

/** Barre flottante : taille de page, total, navigation et exports. */
export function FloatingPagination(props: FloatingPaginationProps) {
  const { total, page, pageCount, pageSize, onPageChange, onPageSizeChange } = props

  return (
    <FloatingBar>
      <Icon name="list" size={18} color="var(--color-muted)" />
      {props.onAdd && (
        <button type="button" className={styles.button} onClick={props.onAdd} aria-label="Nouveau">
          <Icon name="add" size={20} color="#2e9e6a" />
        </button>
      )}
      <input
        className={styles.number}
        type="number"
        min={1}
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value) || 1)}
        aria-label="Lignes par page"
      />
      <CountPill>{total}</CountPill>
      <button type="button" className={styles.button} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Page précédente">
        <Icon name="prev" size={16} />
      </button>
      <input
        className={styles.number}
        type="number"
        min={1}
        max={pageCount}
        value={page}
        onChange={(event) => onPageChange(Math.min(pageCount, Math.max(1, Number(event.target.value) || 1)))}
        aria-label="Page"
      />
      <button type="button" className={styles.button} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Page suivante">
        <Icon name="next" size={16} />
      </button>
      {props.onExportPdf && (
        <button type="button" className={styles.button} onClick={props.onExportPdf} aria-label="Exporter en PDF">
          <Icon name="document" size={18} color="var(--color-danger)" />
        </button>
      )}
      {props.onExportExcel && (
        <button type="button" className={styles.button} onClick={props.onExportExcel} aria-label="Exporter en Excel">
          <Icon name="document" size={18} color="#2e9e6a" />
        </button>
      )}
    </FloatingBar>
  )
}
