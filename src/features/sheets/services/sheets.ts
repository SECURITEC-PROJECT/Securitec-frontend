import { api, apiBlob, apiDownload, apiUpload } from '../../../lib/api'
import type { RowReport, Sheet, SheetFile, SheetRights, SheetRow } from '../types'

const path = (...parts: string[]) => `/sheets${parts.length ? `/${parts.join('/')}` : ''}`

export const fetchPostSheets = async (postId: string) => (await api<{ sheets: Sheet[] }>(`/sheets?postId=${encodeURIComponent(postId)}`)).sheets

export const fetchSiteSheets = async (siteId: string) => (await api<{ sheets: Sheet[] }>(`/sheets?siteId=${encodeURIComponent(siteId)}`)).sheets

export const fetchSheet = async (id: string) => (await api<{ sheet: Sheet }>(path(id))).sheet

export const createSheet = async (postId: string, name: string) => (await api<{ sheet: Sheet }>(path(), { method: 'POST', body: { postId, name } })).sheet

/** Enregistre le nom et la liste complète des colonnes (dans l'ordre voulu). */
export const saveSheet = async (id: string, name: string, columns: { id?: string; label: string; type: string; required: boolean; options: string[]; action?: string; allowUpload?: boolean; allowPhoto?: boolean }[], rights?: SheetRights) =>
  (await api<{ sheet: Sheet }>(path(id), { method: 'PUT', body: { name, columns, ...rights } })).sheet

export const archiveSheet = (id: string) => api(path(id), { method: 'DELETE' })

export const fetchSheetRows = async (sheetId: string) => (await api<{ rows: SheetRow[] }>(path(sheetId, 'rows'))).rows

export const createSheetRow = (sheetId: string, values: Record<string, string>) => api(path(sheetId, 'rows'), { method: 'POST', body: { values } })

export const updateSheetRow = (sheetId: string, rowId: string, values: Record<string, string>) => api(path(sheetId, 'rows', rowId), { method: 'PUT', body: { values } })

export const deleteSheetRow = (sheetId: string, rowId: string) => api(path(sheetId, 'rows', rowId), { method: 'DELETE' })

// ------------------------------------------------------------------ Fichiers joints (colonne « Action »)

const filesPath = (sheetId: string, rowId: string) => path(sheetId, 'rows', rowId, 'files')

export const fetchRowFiles = async (sheetId: string, rowId: string, columnId: string) =>
  (await api<{ files: SheetFile[] }>(`${filesPath(sheetId, rowId)}?columnId=${columnId}`)).files

export const uploadRowFile = (sheetId: string, rowId: string, columnId: string, file: File) =>
  apiUpload(`${filesPath(sheetId, rowId)}?columnId=${columnId}`, file, { 'x-file-name': encodeURIComponent(file.name) })

export const downloadRowFile = (sheetId: string, rowId: string, file: SheetFile) => apiDownload(`${filesPath(sheetId, rowId)}/${file.id}`, file.name)

export const deleteRowFile = (sheetId: string, rowId: string, fileId: string) => api(`${filesPath(sheetId, rowId)}/${fileId}`, { method: 'DELETE' })

/** Contenu d'un fichier joint, pour l'aperçu sans téléchargement. */
export const fetchRowFileBlob = (sheetId: string, rowId: string, file: SheetFile) => apiBlob(`${filesPath(sheetId, rowId)}/${file.id}`)

/** Signalements faits à propos d'une ligne. */
export const fetchRowReports = async (sheetId: string, rowId: string) => (await api<{ reports: RowReport[] }>(path(sheetId, 'rows', rowId, 'reports'))).reports
