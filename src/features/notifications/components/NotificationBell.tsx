import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, SlidePanel } from '../../../components/ui'
import { useNotifications } from '../hooks/useNotifications'
import { markAllNotificationsRead, markNotificationRead, resolveReport } from '../services/notifications'
import type { AppNotification } from '../types'
import { EscalateModal } from './EscalateModal'
import styles from './NotificationBell.module.css'
import { ReportDetailModal } from './ReportDetailModal'

/** « il y a 5 min », « il y a 3 h », sinon la date. */
function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  if (minutes < 24 * 60) return `il y a ${Math.round(minutes / 60)} h`
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Cloche de la barre du haut : nombre de notifications non lues et panneau des signalements reçus, avec leurs actions en icônes. */
export function NotificationBell() {
  const navigate = useNavigate()
  const { unread, escalateTo, notifications, refresh } = useNotifications()
  const [open, setOpen] = useState(false)
  const [escalating, setEscalating] = useState<AppNotification>()
  const [detailId, setDetailId] = useState<string>()
  const [error, setError] = useState('')

  const show = () => {
    setOpen(true)
    void refresh()
  }

  const read = async (note: AppNotification) => {
    if (!note.read) {
      await markNotificationRead(note.id).catch(() => undefined)
      void refresh()
    }
  }

  const openSheet = async (note: AppNotification) => {
    await read(note)
    if (note.link) {
      setOpen(false)
      navigate(note.link)
    }
  }

  const showDetail = (note: AppNotification) => {
    if (!note.reportId) return
    void read(note)
    setDetailId(note.reportId)
  }

  const resolve = async (note: AppNotification) => {
    if (!note.reportId || !window.confirm('Marquer ce signalement comme traité ? Les personnes qui l’ont signalé en seront informées.')) return
    setError('')
    try {
      await resolveReport(note.reportId)
      void refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
    }
  }

  const readAll = async () => {
    setError('')
    try {
      await markAllNotificationsRead()
      void refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
    }
  }

  return (
    <>
      <button type="button" className={styles.bell} onClick={show} title="Notifications" aria-label={unread > 0 ? `Notifications : ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}>
        <Icon name="bell" size={22} color={unread > 0 ? '#e1343f' : 'var(--color-muted)'} />
        {unread > 0 && <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      <SlidePanel title="Notifications" open={open} onClose={() => setOpen(false)} width={400}>
        <div className={styles.toolbar}>
          <span>{unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'}</span>
          <button type="button" onClick={() => void readAll()} disabled={unread === 0}>
            Tout marquer comme lu
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {notifications.length === 0 ? (
          <p className={styles.empty}>Aucune notification.</p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((note) => (
              <li key={note.id} className={`${styles.item} ${note.read ? '' : styles.unread}`}>
                <div className={styles.head}>
                  {!note.read && <span className={styles.dot} aria-label="Non lue" />}
                  <strong>{note.title}</strong>
                  <small>{ago(note.createdAt)}</small>
                </div>
                <p className={styles.body}>{note.body}</p>
                <div className={styles.footer}>
                  {note.status && <span className={note.status === 'resolved' ? styles.statusDone : styles.statusOpen}>{note.status === 'resolved' ? 'Traité' : 'À traiter'}</span>}
                  <span className={styles.spacer} />
                  <div className={styles.icons}>
                    {note.reportId && (
                      <button type="button" onClick={() => showDetail(note)} title="Voir le détail" aria-label="Voir le détail">
                        <Icon name="eye" size={18} color="var(--color-info)" />
                      </button>
                    )}
                    {note.link && (
                      <button type="button" onClick={() => void openSheet(note)} title="Ouvrir la feuille (la ligne signalée est mise en évidence)" aria-label="Ouvrir la feuille">
                        <Icon name="open" size={18} color="var(--color-primary)" />
                      </button>
                    )}
                    {note.canEscalate && escalateTo && (
                      <button type="button" onClick={() => setEscalating(note)} title={`Transmettre au ${escalateTo}`} aria-label={`Transmettre au ${escalateTo}`}>
                        <Icon name="send" size={18} color="var(--color-warning)" />
                      </button>
                    )}
                    {note.canResolve && (
                      <button type="button" onClick={() => void resolve(note)} title="Marquer comme traité" aria-label="Marquer comme traité">
                        <Icon name="done" size={18} color="#2e9e6a" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SlidePanel>

      {detailId && <ReportDetailModal reportId={detailId} escalateTo={escalateTo} onClose={() => setDetailId(undefined)} onChanged={() => void refresh()} />}

      {escalating?.reportId && escalateTo && (
        <EscalateModal
          reportId={escalating.reportId}
          quote={escalating.body}
          target={escalateTo}
          onClose={() => setEscalating(undefined)}
          onDone={() => {
            setEscalating(undefined)
            void refresh()
          }}
        />
      )}
    </>
  )
}
