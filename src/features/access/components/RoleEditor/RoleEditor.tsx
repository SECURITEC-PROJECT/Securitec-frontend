import { useEffect, useState } from 'react'
import { Button, Select, SlidePanel, TextArea, TextField } from '../../../../components/ui'
import { fetchRole } from '../../../../services/access'
import type { PermissionCatalog, RoleDetail, RoleInput, RoleSummary } from '../../types'
import { PermissionMatrix } from '../PermissionMatrix'
import styles from './RoleEditor.module.css'

export type RoleTarget = { mode: 'new' } | { mode: 'edit'; role: RoleSummary }

interface RoleEditorProps {
  target: RoleTarget | null
  catalog: PermissionCatalog
  canUpdate: boolean
  canDelete: boolean
  onSave: (id: string | null, input: RoleInput) => Promise<void>
  onDelete: (role: RoleSummary) => Promise<void>
  onClose: () => void
}

const EMPTY_ROLE: RoleDetail = { id: '', code: '', nom: '', description: '', profilBase: 5, system: false, permissions: [] }

export function RoleEditor({ target, catalog, canUpdate, canDelete, onSave, onDelete, onClose }: RoleEditorProps) {
  const [detail, setDetail] = useState<RoleDetail>()
  const [loadError, setLoadError] = useState('')
  const editingId = target?.mode === 'edit' ? target.role.id : null

  useEffect(() => {
    if (!editingId) return
    let cancelled = false
    fetchRole(editingId)
      .then((role) => !cancelled && setDetail(role))
      .catch((failure: Error) => !cancelled && setLoadError(failure.message))
    return () => {
      cancelled = true
      setDetail(undefined)
      setLoadError('')
    }
  }, [editingId])

  const ready = target?.mode === 'new' || detail?.id === editingId
  const initial = target?.mode === 'new' ? EMPTY_ROLE : detail

  return (
    <SlidePanel title={target?.mode === 'new' ? 'Nouveau rôle' : (target?.role.nom ?? '')} open={target !== null} onClose={onClose}>
      {loadError && <p className={styles.error}>{loadError}</p>}
      {target && ready && initial && (
        <RoleForm
          key={editingId ?? 'new'}
          initial={initial}
          catalog={catalog}
          canUpdate={canUpdate}
          canDelete={canDelete && target.mode === 'edit' && !initial.system}
          onSave={(input) => onSave(editingId, input)}
          onDelete={target.mode === 'edit' ? () => onDelete(target.role) : undefined}
        />
      )}
      {target && !ready && !loadError && <p className={styles.status}>Chargement...</p>}
    </SlidePanel>
  )
}

interface RoleFormProps {
  initial: RoleDetail
  catalog: PermissionCatalog
  canUpdate: boolean
  canDelete: boolean
  onSave: (input: RoleInput) => Promise<void>
  onDelete?: () => Promise<void>
}

function RoleForm({ initial, catalog, canUpdate, canDelete, onSave, onDelete }: RoleFormProps) {
  const [nom, setNom] = useState(initial.nom)
  const [description, setDescription] = useState(initial.description ?? '')
  const [profilBase, setProfilBase] = useState(initial.profilBase)
  const [selected, setSelected] = useState(() => new Set(initial.permissions))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Le rôle Administrateur garantit un accès complet : il n'est pas modifiable.
  const locked = initial.system && initial.profilBase === 1
  const editable = canUpdate && !locked
  const profileOptions = Object.entries(catalog.profiles).map(([value, label]) => ({ value, label }))

  const run = async (action: () => Promise<void>) => {
    setSaving(true)
    setError('')
    try {
      await action()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
      setSaving(false)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        void run(() => onSave({ nom, description, profilBase, permissions: [...selected] }))
      }}
    >
      {locked && <p className={styles.notice}>Le rôle Administrateur donne un accès complet et ne peut pas être modifié.</p>}
      <TextField label="Nom du rôle" required value={nom} disabled={!editable} onChange={(event) => setNom(event.target.value)} />
      <TextArea label="Description" value={description} disabled={!editable} onChange={(event) => setDescription(event.target.value)} />
      <Select
        label="Profil de base"
        value={String(profilBase)}
        options={profileOptions}
        disabled={!editable || initial.system}
        onChange={(event) => setProfilBase(Number(event.target.value))}
      />
      <p className={styles.hint}>
        Le profil de base fixe le périmètre : « Administrateur » voit tous les sites, les autres profils sont limités à leur site.
      </p>

      <h3 className={styles.section}>Permissions · {selected.size}</h3>
      <PermissionMatrix catalog={catalog} selected={selected} onChange={setSelected} disabled={!editable} />

      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        {canDelete && onDelete ? (
          <Button type="button" variant="outline" disabled={saving} onClick={() => void run(onDelete)}>
            Supprimer
          </Button>
        ) : (
          <span />
        )}
        {editable && (
          <Button type="submit" disabled={saving || !nom.trim()}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        )}
      </div>
    </form>
  )
}
