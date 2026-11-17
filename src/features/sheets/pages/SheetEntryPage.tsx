import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { usePrintTitle } from '../../../components/layout/PrintHeader'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { useCurrentUser, usePermissions } from '../../auth'
import { DirectoryPage } from '../../directories'
import { fetchReportTargets } from '../../notifications/services/notifications'
import type { ReportTarget } from '../../notifications/types'
import { AttachmentsCell } from '../components/AttachmentsCell'
import { ReportModal } from '../components/ReportModal'
import { RowDetailPanel } from '../components/RowDetailPanel'
import type { DirectoryConfig, DirectoryField, DirectoryRow } from '../../directories/types'
import { createSheetRow, deleteSheetRow, fetchSheet, fetchSheetRows, updateSheetRow } from '../services/sheets'
import { describeRights } from '../types'
import type { ColumnType, Sheet } from '../types'
import styles from './SheetPages.module.css'

const FIELD_TYPE: Record<ColumnType, DirectoryField['type']> = { TEXT: 'text', NUMBER: 'number', DATE: 'date', TIME: 'time', SELECT: 'select', CHECKBOX: 'select', ACTION: 'text' }
const YES_NO = [
  { value: 'Oui', label: 'Oui' },
  { value: 'Non', label: 'Non' },
]

const formatDateTime = (iso: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '')

/** Ce que l'API accepte : uniquement les colonnes de la feuille (les colonnes automatiques sont calculées par le serveur). */
const columnValues = (sheet: Sheet, values: Record<string, string>) =>
  Object.fromEntries(sheet.columns.filter((column) => column.type !== 'ACTION').map((column) => [column.id, (values[column.id] ?? '').trim()]))

/** Annuaire générique : ses champs sont les colonnes configurées pour la feuille, plus la date et l'auteur de saisie. */
function buildConfig(
  sheet: Sheet,
  canAttach: boolean,
  isAdmin: boolean,
  onReport: ((row: DirectoryRow) => void) | undefined,
  reportLabel: string,
  onView: (row: DirectoryRow) => void,
  highlightId: string | undefined,
): DirectoryConfig {
  return {
    key: `sheet:${sheet.id}`,
    module: 'sheets',
    title: sheet.name,
    subtitle: `Poste de garde : ${sheet.postName}. Droits sur cette feuille : ${isAdmin ? 'accès complet (administrateur)' : describeRights(sheet).toLowerCase()}.`,
    newLabel: 'Nouvelle ligne',
    spreadsheet: true,
    reportRow: onReport,
    reportLabel,
    detailRow: onView,
    highlightId,
    // Une ligne signalée reste rouge tant qu'un signalement n'est pas traité.
    rowTone: (row) => (Number(row.values._openReports) > 0 ? 'danger' : undefined),
    // Un administrateur n'est pas limité par les droits de la feuille.
    limits: isAdmin ? undefined : { create: sheet.allowCreate, update: sheet.allowUpdate, delete: sheet.allowDelete },
    searchPlaceholder: 'Rechercher dans la feuille…',
    emptyText: sheet.columns.length === 0 ? 'Cette feuille n’a pas encore de colonnes : ajoutez-en dans les paramètres du poste.' : 'Aucune ligne saisie.',
    // Une colonne « Action » ne se saisit pas : elle n'a donc pas de champ (sa cellule est un bouton).
    fields: sheet.columns.filter((column) => column.type !== 'ACTION').map((column) => ({
      key: column.id,
      label: column.label,
      type: FIELD_TYPE[column.type],
      required: column.required,
      options: column.type === 'SELECT' ? column.options.map((option) => ({ value: option, label: option })) : column.type === 'CHECKBOX' ? YES_NO : undefined,
    })),
    columns: [
      ...sheet.columns.map((column) =>
        column.type === 'ACTION'
          ? {
              key: column.id,
              label: column.label,
              render: (row: DirectoryRow) => (
                <AttachmentsCell
                  key={`${row.id}:${row.values[column.id]}`}
                  sheetId={sheet.id}
                  rowId={row.id}
                  columnId={column.id}
                  columnLabel={column.label}
                  count={Number(row.values[column.id] || 0)}
                  editable={canAttach}
                  allowUpload={column.allowUpload}
                  allowPhoto={column.allowPhoto}
                />
              ),
            }
          : { key: column.id, label: column.label },
      ),
      { key: '_date', label: 'Saisi le', render: (row) => formatDateTime(row.values._date) },
      { key: '_author', label: 'Par' },
    ],
    load: async () =>
      (await fetchSheetRows(sheet.id)).map((row) => ({
        id: row.id,
        active: true,
        // Le nombre de fichiers joints sert à l'affichage, au tri et à la recherche de la colonne « Action ».
        values: {
          ...row.values,
          _openReports: String(row.openReports),
          ...Object.fromEntries(Object.entries(row.fileCounts).map(([columnId, total]) => [columnId, String(total)])),
          _date: row.createdAt,
          _author: row.author ?? '',
        },
      })),
    create: (_siteId, values) => createSheetRow(sheet.id, columnValues(sheet, values)),
    update: (_siteId, row, values) => updateSheetRow(sheet.id, row.id, columnValues(sheet, values)),
    remove: (_siteId, row) => deleteSheetRow(sheet.id, row.id),
  }
}

/** Saisie d'une feuille : un tableau façon Excel dont les en-têtes ont été définis dans les paramètres du poste. */
export function SheetEntryPage() {
  const { sheetId = '' } = useParams()
  const site = useCurrentSite()
  const { can } = usePermissions()
  const me = useCurrentUser()
  const [sheet, setSheet] = useState<Sheet | null | undefined>()
  // À l'impression, l'en-tête affiche le nom de la feuille de saisie.
  usePrintTitle(sheet ? sheet.name : undefined)
  const [error, setError] = useState('')
  const [targets, setTargets] = useState<ReportTarget[]>([])
  const [reporting, setReporting] = useState<DirectoryRow>()
  const [viewing, setViewing] = useState<DirectoryRow>()
  // Lien d'une notification : /feuilles/:id?row=… met la ligne signalée en évidence.
  const highlightId = useSearchParams()[0].get('row') ?? undefined

  // À qui peut-on signaler un problème ? (aucun niveau : pas de bouton)
  useEffect(() => {
    let cancelled = false
    fetchReportTargets()
      .then((loaded) => !cancelled && setTargets(loaded))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchSheet(sheetId)
      .then((loaded) => !cancelled && setSheet(loaded.siteId === site.id ? loaded : null))
      .catch((failure: Error) => {
        if (cancelled) return
        setError(failure.message)
        setSheet(null)
      })
    return () => {
      cancelled = true
    }
  }, [sheetId, site.id])

  const isAdmin = me.profile === 1
  // Joindre ou retirer un fichier modifie la ligne : il faut aussi que la feuille autorise la modification (sauf pour un administrateur).
  const canAttach = can('sheets.update') && (isAdmin || (sheet?.allowUpdate ?? false))
  // Les lignes d'une feuille ne sont accessibles qu'aux utilisateurs affectés au poste, et à l'administrateur (le serveur le vérifie aussi).
  const allowed = sheet ? isAdmin || sheet.postUsers.some((user) => user.id === me.id) : false
  const reportLabel = targets.length === 1 ? `Signaler au ${targets[0].label.toLowerCase()}` : 'Signaler au supérieur'
  const canReport = targets.length > 0
  const config = useMemo(
    () => (sheet && allowed ? buildConfig(sheet, canAttach, isAdmin, canReport ? setReporting : undefined, reportLabel, setViewing, highlightId) : undefined),
    [sheet, allowed, canAttach, isAdmin, canReport, reportLabel, highlightId],
  )

  /** Résumé lisible d'une ligne pour le signalement (ses premières valeurs renseignées). */
  const summarize = (row: DirectoryRow) =>
    sheet?.columns
      .filter((column) => column.type !== 'ACTION' && row.values[column.id])
      .slice(0, 3)
      .map((column) => `${column.label} : ${row.values[column.id]}`)
      .join(' · ') ?? ''

  if (sheet === undefined) return <p className={styles.status}>Chargement...</p>
  if (sheet && !allowed) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>
          Les feuilles de saisie du poste « {sheet.postName} » sont réservées aux utilisateurs qui lui sont affectés{sheet.postUsers.length > 0 ? ` (${sheet.postUsers.map((user) => user.name).join(', ')})` : ''}.
        </p>
        <Link to={`/sites/${site.id}/feuilles`}>← Mes feuilles</Link>
      </div>
    )
  }
  if (!sheet || !config) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Feuille introuvable.'}</p>
        <Link to={`/sites/${site.id}/feuilles`}>← Toutes les feuilles</Link>
      </div>
    )
  }

  return (
    <>
      {can('administration.update') && (
        <div className={styles.designLink} data-print="hide">
          <Link to={`/sites/${site.id}/postes/${sheet.postId}/feuilles/${sheet.id}`}>⚙ Modifier les colonnes de cette feuille</Link>
        </div>
      )}
      <DirectoryPage key={sheet.id} config={config} />
      {viewing && <RowDetailPanel sheet={sheet} row={viewing} onClose={() => setViewing(undefined)} />}
      {reporting && <ReportModal sheet={sheet} row={{ id: reporting.id, summary: summarize(reporting) }} targets={targets} onClose={() => setReporting(undefined)} />}
    </>
  )
}
