import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePrintTitle } from '../../../components/layout/PrintHeader'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { Button, Icon } from '../../../components/ui'
import { useCurrentUser, usePermissions } from '../../auth'
import { archiveSheet, fetchSheet, saveSheet } from '../services/sheets'
import { COLUMN_ACTIONS, COLUMN_TYPES } from '../types'
import { describeRights } from '../types'
import type { ColumnDraft, ColumnType, Sheet, SheetRights } from '../types'
import styles from './SheetBuilderPage.module.css'

let counter = 0
const newKey = () => `new-${(counter += 1)}`

const toDrafts = (sheet: Sheet): ColumnDraft[] =>
  sheet.columns.map((column) => ({ key: column.id, id: column.id, label: column.label, type: column.type, required: column.required, options: column.options.join('\n'), action: column.action ?? 'ATTACH_FILES', allowUpload: column.allowUpload, allowPhoto: column.allowPhoto }))

const splitOptions = (value: string) => value.split(/[\n,;]/).map((option) => option.trim()).filter(Boolean)

/** Constructeur d'une feuille : son nom et ses en-têtes de colonnes (nom, type, obligatoire, choix), dans l'ordre voulu. */
export function SheetBuilderPage() {
  const { postId = '', sheetId = '' } = useParams()
  const site = useCurrentSite()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const me = useCurrentUser()
  const [sheet, setSheet] = useState<Sheet | null | undefined>()
  usePrintTitle(sheet ? `Colonnes de la feuille « ${sheet.name} »` : undefined)
  const [name, setName] = useState('')
  const [columns, setColumns] = useState<ColumnDraft[]>([])
  const [rights, setRights] = useState<SheetRights>({ allowCreate: true, allowUpdate: true, allowDelete: false })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const editable = can('administration.update')
  const backToPost = `/sites/${site.id}/postes/${postId}`

  useEffect(() => {
    let cancelled = false
    fetchSheet(sheetId)
      .then((loaded) => {
        if (cancelled) return
        if (loaded.siteId !== site.id || loaded.postId !== postId) return setSheet(null)
        setSheet(loaded)
        setName(loaded.name)
        setColumns(toDrafts(loaded))
        setRights({ allowCreate: loaded.allowCreate, allowUpdate: loaded.allowUpdate, allowDelete: loaded.allowDelete })
      })
      .catch((failure: Error) => {
        if (cancelled) return
        setError(failure.message)
        setSheet(null)
      })
    return () => {
      cancelled = true
    }
  }, [sheetId, postId, site.id])

  const changeRights = (patch: Partial<SheetRights>) => {
    setRights((current) => ({ ...current, ...patch }))
    setDirty(true)
    setNotice('')
  }

  const change = (key: string, patch: Partial<ColumnDraft>) => {
    setColumns((current) => current.map((column) => (column.key === key ? { ...column, ...patch } : column)))
    setDirty(true)
    setNotice('')
  }
  const add = () => {
    setColumns((current) => [...current, { key: newKey(), label: '', type: 'TEXT', required: false, options: '', action: 'ATTACH_FILES', allowUpload: true, allowPhoto: false }])
    setDirty(true)
    setNotice('')
  }
  const remove = (key: string) => {
    setColumns((current) => current.filter((column) => column.key !== key))
    setDirty(true)
    setNotice('')
  }
  const move = (index: number, direction: -1 | 1) => {
    setColumns((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setDirty(true)
    setNotice('')
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await saveSheet(
        sheetId,
        name.trim(),
        columns.map((column) => ({ id: column.id, label: column.label.trim(), type: column.type, required: column.type !== 'ACTION' && column.required, options: column.type === 'SELECT' ? splitOptions(column.options) : [], ...(column.type === 'ACTION' && { action: column.action, allowUpload: column.allowUpload, allowPhoto: column.allowPhoto }) })),
        rights,
      )
      setSheet(saved)
      setName(saved.name)
      setColumns(toDrafts(saved))
      setRights({ allowCreate: saved.allowCreate, allowUpdate: saved.allowUpdate, allowDelete: saved.allowDelete })
      setDirty(false)
      setNotice('Feuille enregistrée.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!sheet || !window.confirm(`Archiver la feuille « ${sheet.name} » ? Les lignes déjà saisies sont conservées.`)) return
    try {
      await archiveSheet(sheet.id)
      navigate(backToPost, { replace: true })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Archivage impossible.')
    }
  }

  if (sheet === undefined) return <p className={styles.status}>Chargement...</p>
  if (sheet === null) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Feuille introuvable.'}</p>
        <Link to={backToPost}>← Retour au poste</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 data-plain className={styles.title}>
            Feuille « {sheet.name} »
          </h1>
          <p className={styles.subtitle}>
            Poste de garde : {sheet.postName}. Définissez les colonnes que les utilisateurs devront compléter, comme les en-têtes d'un classeur Excel.
          </p>
        </div>
        <div className={styles.tools}>
          {can('sheets.view') && (me.profile === 1 || sheet.postUsers.some((user) => user.id === me.id)) && (
            <Link to={`/sites/${site.id}/feuilles/${sheet.id}`} className={styles.open}>
              Ouvrir la feuille →
            </Link>
          )}
          <button type="button" className={styles.back} onClick={() => navigate(backToPost)} title="Retour au poste" aria-label="Retour au poste">
            <Icon name="prev" size={22} color="#7939b8" />
          </button>
        </div>
      </header>

      <p className={sheet.postUsers.length > 0 ? styles.assignee : styles.noAssignee} role="note">
        {sheet.postUsers.length > 0
          ? `Seuls les utilisateurs affectés au poste (${sheet.postUsers.map((user) => user.name).join(', ')}) peuvent voir et remplir cette feuille.`
          : 'Aucun utilisateur n\'est affecté à ce poste : personne ne pourra voir ni remplir cette feuille. Affectez des utilisateurs dans les paramètres du poste.'}
      </p>

      <section className={styles.card}>
        <label className={styles.nameField}>
          <span>Nom de la feuille</span>
          <input
            value={name}
            disabled={!editable}
            onChange={(event) => {
              setName(event.target.value)
              setDirty(true)
              setNotice('')
            }}
          />
        </label>

        <div className={styles.table} role="table" aria-label="Colonnes de la feuille">
          <div className={`${styles.line} ${styles.head}`} role="row">
            <span>#</span>
            <span>Nom de la colonne</span>
            <span>Type</span>
            <span>Obligatoire</span>
            <span />
          </div>
          {columns.length === 0 && <p className={styles.empty}>Aucune colonne. Ajoutez la première ci-dessous.</p>}
          {columns.map((column, index) => (
            <div key={column.key} className={styles.row} role="row">
              <div className={styles.line}>
                <span className={styles.index}>{index + 1}</span>
                <input
                  aria-label={`Nom de la colonne ${index + 1}`}
                  placeholder="Ex. : Heure d'arrivée"
                  value={column.label}
                  disabled={!editable}
                  autoFocus={!column.id && column.label === ''}
                  onChange={(event) => change(column.key, { label: event.target.value })}
                />
                <select aria-label={`Type de la colonne ${index + 1}`} value={column.type} disabled={!editable} onChange={(event) => change(column.key, { type: event.target.value as ColumnType })}>
                  {COLUMN_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {column.type === 'ACTION' ? (
                  <span className={styles.notApplicable}>—</span>
                ) : (
                  <label className={styles.required}>
                    <input type="checkbox" checked={column.required} disabled={!editable} onChange={(event) => change(column.key, { required: event.target.checked })} />
                    Oui
                  </label>
                )}
                {editable && (
                  <span className={styles.actions}>
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter" title="Monter">
                      ▲
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === columns.length - 1} aria-label="Descendre" title="Descendre">
                      ▼
                    </button>
                    <button type="button" onClick={() => remove(column.key)} aria-label="Supprimer la colonne" title="Supprimer la colonne">
                      <Icon name="trash" size={15} color="var(--color-danger)" />
                    </button>
                  </span>
                )}
              </div>
              {column.type === 'ACTION' && (
                <label className={styles.options}>
                  <span>Action de la colonne</span>
                  <select aria-label={`Action de la colonne ${index + 1}`} value={column.action} disabled={!editable} onChange={(event) => change(column.key, { action: event.target.value as ColumnDraft['action'] })}>
                    {COLUMN_ACTIONS.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <small className={styles.help}>Dans le tableau, la cellule permet de joindre, télécharger et supprimer des fichiers pour chaque ligne.</small>
                </label>
              )}
              {column.type === 'ACTION' && column.action === 'ATTACH_FILES' && (
                <fieldset className={styles.choices} disabled={!editable}>
                  <legend>Comment joindre un fichier ?</legend>
                  <label>
                    <input type="checkbox" checked={column.allowUpload} onChange={(event) => change(column.key, { allowUpload: event.target.checked })} />
                    Envoyer des fichiers depuis l'appareil
                  </label>
                  <label>
                    <input type="checkbox" checked={column.allowPhoto} onChange={(event) => change(column.key, { allowPhoto: event.target.checked })} />
                    Prendre une photo avec la caméra
                  </label>
                  {!column.allowUpload && !column.allowPhoto && <small className={styles.warn}>Choisissez au moins une façon de joindre un fichier.</small>}
                  {column.allowPhoto && !column.allowUpload && <small className={styles.help}>Cette colonne n'accepte alors que des photos.</small>}
                </fieldset>
              )}
              {column.type === 'SELECT' && (
                <label className={styles.options}>
                  <span>Choix proposés (un par ligne)</span>
                  <textarea rows={3} value={column.options} disabled={!editable} placeholder={'Ex. :\nNormal\nAnomalie'} onChange={(event) => change(column.key, { options: event.target.value })} />
                </label>
              )}
            </div>
          ))}
        </div>

        {editable && (
          <div className={styles.footer}>
            <button type="button" className={styles.addColumn} onClick={add}>
              + Ajouter une colonne
            </button>
            <span className={styles.spacer} />
            {notice && <span className={styles.notice}>{notice}</span>}
            <Button type="button" onClick={() => void save()} disabled={!dirty || saving || !name.trim()} className={styles.save}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="rights-title">
        <h2 id="rights-title" className={styles.sectionTitle}>
          Droits des utilisateurs sur cette feuille
        </h2>
        <p className={styles.sectionHelp}>
          S'ajoutent aux permissions du rôle : une action n'est possible que si le rôle <strong>et</strong> la feuille l'autorisent. Tout décocher donne une feuille en lecture seule.
        </p>
        <fieldset className={styles.rights} disabled={!editable}>
          <label>
            <input type="checkbox" checked={rights.allowCreate} onChange={(event) => changeRights({ allowCreate: event.target.checked })} />
            Peuvent ajouter des lignes
          </label>
          <label>
            <input type="checkbox" checked={rights.allowUpdate} onChange={(event) => changeRights({ allowUpdate: event.target.checked })} />
            Peuvent modifier les lignes (et leurs fichiers joints)
          </label>
          <label>
            <input type="checkbox" checked={rights.allowDelete} onChange={(event) => changeRights({ allowDelete: event.target.checked })} />
            Peuvent supprimer des lignes
          </label>
        </fieldset>
        <p className={styles.rightsSummary}>{describeRights(rights)}</p>
        {editable && (
          <div className={styles.footer}>
            <span className={styles.spacer} />
            {notice && <span className={styles.notice}>{notice}</span>}
            <Button type="button" onClick={() => void save()} disabled={!dirty || saving || !name.trim()} className={styles.save}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        )}
      </section>

      {editable && (
        <button type="button" className={styles.archive} onClick={() => void archive()}>
          Archiver cette feuille
        </button>
      )}
    </div>
  )
}
