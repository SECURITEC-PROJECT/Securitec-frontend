import { useEffect, useState } from 'react'
import { SlidePanel } from '../../../components/ui'
import { fetchRowReports } from '../services/sheets'
import type { RowReport, Sheet } from '../types'
import { RowFiles } from './RowFiles'
import styles from './RowDetailPanel.module.css'

interface RowDetailPanelProps {
  sheet: Sheet
  /** Ligne affichée : valeurs par identifiant de colonne, plus `_date` et `_author` ajoutés par la feuille. */
  row: { id: string; values: Record<string, string> }
  onClose: () => void
}

const formatDateTime = (iso: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const formatValue = (type: string, value: string) => (!value ? '—' : type === 'DATE' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00`).toLocaleDateString('fr-FR') : value)

/** Détail d'une ligne de feuille en lecture : toutes ses valeurs, ses fichiers joints, qui l'a saisie, et les signalements dont elle fait l'objet. */
export function RowDetailPanel({ sheet, row, onClose }: RowDetailPanelProps) {
  const [reports, setReports] = useState<RowReport[]>()

  useEffect(() => {
    let cancelled = false
    fetchRowReports(sheet.id, row.id)
      .then((loaded) => !cancelled && setReports(loaded))
      .catch(() => !cancelled && setReports([]))
    return () => {
      cancelled = true
    }
  }, [sheet.id, row.id])

  return (
    <SlidePanel title="Détail de la ligne" open onClose={onClose} width={440}>
      <p className={styles.context}>
        {sheet.postName} — {sheet.name}
      </p>
      <dl className={styles.fields}>
        {sheet.columns.map((column) => (
          <div key={column.id}>
            <dt>{column.label}</dt>
            <dd>
              {column.type === 'ACTION' ? (
                <RowFiles sheetId={sheet.id} rowId={row.id} columnId={column.id} count={Number(row.values[column.id] || 0)} />
              ) : (
                formatValue(column.type, row.values[column.id] ?? '')
              )}
            </dd>
          </div>
        ))}
        <div>
          <dt>Saisi le</dt>
          <dd>{formatDateTime(row.values._date)}</dd>
        </div>
        <div>
          <dt>Par</dt>
          <dd>{row.values._author || '—'}</dd>
        </div>
      </dl>

      <h3 className={styles.title}>Signalements sur cette ligne</h3>
      {reports === undefined ? (
        <p className={styles.muted}>Chargement…</p>
      ) : reports.length === 0 ? (
        <p className={styles.muted}>Aucun signalement.</p>
      ) : (
        <ul className={styles.reports}>
          {reports.map((report) => (
            <li key={report.id}>
              <div className={styles.reportHead}>
                <strong>
                  {report.reporter} → {report.toLabel}
                </strong>
                <span className={report.resolved ? styles.done : styles.open}>{report.resolved ? `Traité${report.resolvedBy ? ` par ${report.resolvedBy}` : ''}` : 'À traiter'}</span>
              </div>
              <small className={styles.muted}>{formatDateTime(report.createdAt)}</small>
              <p>{report.message}</p>
            </li>
          ))}
        </ul>
      )}
    </SlidePanel>
  )
}
