import { useCallback, useEffect, useState } from 'react'
import { FilePreview, Icon, Modal } from '../../../components/ui'
import { apiDownload } from '../../../lib/api'
import { fetchReportDetail, fetchReportFileBlob, resolveReport } from '../services/notifications'
import type { ReportDetail } from '../types'
import { EscalateModal } from './EscalateModal'
import styles from './ReportDetailModal.module.css'

interface ReportDetailModalProps {
  reportId: string
  /** Libellé du niveau supérieur si l'utilisateur peut transmettre. */
  escalateTo: string | null
  onClose: () => void
  /** Appelé après une transmission ou un traitement (pour actualiser les notifications). */
  onChanged: () => void
}

const formatSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`)
const formatDateTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const formatValue = (type: string, value: string) => (!value ? '—' : type === 'DATE' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00`).toLocaleDateString('fr-FR') : value)

/** Détail d'un signalement : message, ligne concernée (valeurs et fichiers), chaîne de transmission, et actions (traiter, transmettre). */
export function ReportDetailModal({ reportId, escalateTo, onClose, onChanged }: ReportDetailModalProps) {
  const [detail, setDetail] = useState<ReportDetail>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [preview, setPreview] = useState<{ name: string; load: () => Promise<Blob | null>; download: () => void }>()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchReportDetail(reportId)
      .then((loaded) => !cancelled && setDetail(loaded))
      .catch((failure: Error) => !cancelled && setError(failure.message))
    return () => {
      cancelled = true
    }
  }, [reportId, version])

  const changed = useCallback(() => {
    setVersion((value) => value + 1)
    onChanged()
  }, [onChanged])

  const resolve = async () => {
    if (!window.confirm('Marquer ce signalement comme traité ? Les personnes qui l’ont signalé en seront informées.')) return
    setBusy(true)
    setError('')
    try {
      await resolveReport(reportId)
      changed()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Détail du signalement" open onClose={onClose} wide>
      {error && <p className={styles.error}>{error}</p>}
      {!detail ? (
        !error && <p className={styles.muted}>Chargement…</p>
      ) : (
        <div className={styles.detail}>
          <header className={styles.head}>
            <div>
              <strong>{detail.report.reporter}</strong> <span className={styles.muted}>({detail.report.fromLabel})</span> → {detail.report.toLabel}
              <div className={styles.muted}>
                {formatDateTime(detail.report.createdAt)} · poste « {detail.report.sheet.postName} » · feuille « {detail.report.sheet.name} »
              </div>
            </div>
            <span className={detail.report.resolved ? styles.done : styles.open}>
              {detail.report.resolved ? `Traité${detail.report.resolvedBy ? ` par ${detail.report.resolvedBy}` : ''}` : 'À traiter'}
            </span>
          </header>

          <p className={styles.message}>{detail.report.message}</p>

          <section>
            <h3>Ligne concernée</h3>
            {!detail.row ? (
              <p className={styles.muted}>La ligne a été supprimée de la feuille depuis le signalement.</p>
            ) : (
              <>
                <dl className={styles.fields}>
                  {detail.row.fields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{formatValue(field.type, field.value)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>Saisi le</dt>
                    <dd>
                      {formatDateTime(detail.row.createdAt)}
                      {detail.row.author ? ` par ${detail.row.author}` : ''}
                    </dd>
                  </div>
                </dl>
                {detail.row.fileGroups.map((group) => (
                  <div key={group.label} className={styles.files}>
                    <h4>{group.label}</h4>
                    {group.files.length === 0 ? (
                      <p className={styles.muted}>Aucun fichier.</p>
                    ) : (
                      <ul>
                        {group.files.map((file) => (
                          <li key={file.id}>
                            <span className={styles.fileName}>{file.name}</span>
                            <small>{formatSize(file.size)}</small>
                            <button
                              type="button"
                              className={styles.iconButton}
                              title="Voir le fichier"
                              aria-label={`Voir ${file.name}`}
                              onClick={() =>
                                setPreview({
                                  name: file.name,
                                  load: () => fetchReportFileBlob(reportId, file.id),
                                  download: () => void apiDownload(`/reports/${reportId}/files/${file.id}`, file.name).catch(() => undefined),
                                })
                              }
                            >
                              <Icon name="eye" size={16} color="var(--color-info)" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </section>

          {detail.thread.length > 1 && (
            <section>
              <h3>Historique des transmissions</h3>
              <ol className={styles.thread}>
                {detail.thread.map((entry) => (
                  <li key={entry.id} className={entry.current ? styles.current : ''}>
                    <strong>{entry.reporter}</strong> ({entry.fromLabel}) → {entry.toLabel} <small>{formatDateTime(entry.createdAt)}</small>
                    {entry.resolved && <span className={styles.done}>Traité</span>}
                    <div className={styles.muted}>{entry.message}</div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(detail.canResolve || (detail.canEscalate && escalateTo)) && (
            <footer className={styles.actions}>
              {detail.canEscalate && escalateTo && (
                <button type="button" className={styles.iconButton} title={`Transmettre au ${escalateTo}`} aria-label={`Transmettre au ${escalateTo}`} onClick={() => setEscalating(true)} disabled={busy}>
                  <Icon name="send" size={20} color="var(--color-warning)" />
                </button>
              )}
              {detail.canResolve && (
                <button type="button" className={styles.iconButton} title="Marquer comme traité" aria-label="Marquer comme traité" onClick={() => void resolve()} disabled={busy}>
                  <Icon name="done" size={20} color="#2e9e6a" />
                </button>
              )}
            </footer>
          )}
        </div>
      )}

      {preview && <FilePreview open name={preview.name} load={preview.load} onDownload={preview.download} onClose={() => setPreview(undefined)} />}
      {escalating && detail && escalateTo && (
        <EscalateModal
          reportId={reportId}
          quote={detail.report.message}
          target={escalateTo}
          onClose={() => setEscalating(false)}
          onDone={() => {
            setEscalating(false)
            changed()
          }}
        />
      )}
    </Modal>
  )
}
