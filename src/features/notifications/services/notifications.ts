import { api, apiBlob } from '../../../lib/api'
import type { NotificationsData, ReportDetail, ReportTarget } from '../types'

export const fetchNotifications = () => api<NotificationsData>('/notifications')

export const markNotificationRead = (id: string) => api(`/notifications/${id}/read`, { method: 'POST' })

export const markAllNotificationsRead = () => api('/notifications/read-all', { method: 'POST' })

/** Niveaux auxquels l'utilisateur peut adresser un signalement (liste vide : pas de bouton « Signaler au supérieur »). */
export const fetchReportTargets = async () => (await api<{ targets: ReportTarget[] }>('/reports/targets')).targets

/** Signale un problème dans une feuille (éventuellement à propos d'une ligne). Renvoie les noms des personnes notifiées. */
export const createReport = async (input: { sheetId: string; rowId?: string; message: string; toProfile?: number }) =>
  (await api<{ recipients: string[] }>('/reports', { method: 'POST', body: input })).recipients

/** Transmet un signalement reçu au niveau supérieur. */
export const escalateReport = async (reportId: string, message: string) =>
  (await api<{ recipients: string[] }>(`/reports/${reportId}/escalate`, { method: 'POST', body: { message } })).recipients

export const fetchReportDetail = (reportId: string) => api<ReportDetail>(`/reports/${reportId}`)

/** Marque le signalement (et ceux dont il est la transmission) comme traité. */
export const resolveReport = (reportId: string) => api(`/reports/${reportId}/resolve`, { method: 'POST' })

/** Contenu d'un fichier de la ligne signalée, pour l'aperçu. */
export const fetchReportFileBlob = (reportId: string, fileId: string) => apiBlob(`/reports/${reportId}/files/${fileId}`)
